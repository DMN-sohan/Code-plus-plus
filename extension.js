const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const givePrompt = require("./prompts");

let isProcessing = false;

const CODE_PLUS_PLUS_PARTICIPANT_ID = 'code-plus-plus.copilot';
const MODEL_SELECTOR = { vendor: 'copilot', family: 'gpt-3.5-turbo' };

function activate(context) {
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            "code-plus-plus.configView",
            createConfigViewWebview(context)
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("code-plus-plus.openConfigView", () => {
            vscode.window.showInformationMessage("Code++ is now active");
        })
    );

    vscode.workspace.onDidChangeTextDocument((event) => handleTextExtraction(event, context));

    // Register the Copilot chat participant
    const copilotParticipant = vscode.chat.createChatParticipant(CODE_PLUS_PLUS_PARTICIPANT_ID, copilotChatHandler);
    context.subscriptions.push(copilotParticipant);
}

async function handleTextExtraction(event, context) {
    if (isProcessing || !isActiveTextEditor(event)) return;

    const editor = vscode.window.activeTextEditor;
    const document = editor.document;
    const inputText = document.getText();
    const fileType = getFileType(document.fileName);
    const { marker, endMarker } = getMarkers(fileType);
    
    const { startIdx, endIdx } = findMarkerIndices(inputText, marker, endMarker);
    if (!areValidIndices(startIdx - marker.length, endIdx)) return;

    isProcessing = true;

    try {
        const textBetweenMarkers = inputText.substring(startIdx, endIdx);
        await processTextBetweenMarkers(textBetweenMarkers, fileType, document, inputText, startIdx, endIdx, marker, endMarker, context);
    } finally {
        isProcessing = false;
    }
}

function isActiveTextEditor(event) {
    return vscode.window.activeTextEditor && event.document === vscode.window.activeTextEditor.document;
}

function getFileType(fileName) {
    return fileName.split(".").pop();
}

function getMarkers(fileType) {
    return { marker: "@@ code++", endMarker: "@@" };
}

function findMarkerIndices(inputText, marker, endMarker) {
    const startIdx = inputText.indexOf(marker) + marker.length;
    const endIdx = inputText.indexOf(endMarker, startIdx);
    return { startIdx, endIdx };
}

function areValidIndices(startIdx, endIdx) {
    return startIdx !== -1 && endIdx !== -1 && startIdx < endIdx;
}

async function processTextBetweenMarkers(textBetweenMarkers, fileType, document, inputText, startIdx, endIdx, marker, endMarker, context) {
    const codeConfig = context.globalState.get("codeConfig", {
        "generate-comments": false,
        "fix-bugs": true,
        "optimize-code": false,
        "generate-code": false,
    });

    try {
        const updatedText = await processCopilotRequest(textBetweenMarkers, fileType, codeConfig);
        await removeMarkersAndUpdate(document, inputText, updatedText, startIdx, endIdx, marker, endMarker);
    } catch (error) {
        console.error("Error processing text:", error);
        vscode.window.showErrorMessage("Error processing with Copilot. Try again later.");
    }
}

function extractCodeBlock(markdown) {
  const codeBlockPattern = /```[\w]*\n([\s\S]*?)```/;
  const match = markdown.match(codeBlockPattern);

  if (match) {
    return match[1];
  } else {
    return '';
  }
}

async function processCopilotRequest(textBetweenMarkers, fileType, codeConfig) {
    try {
        const [model] = await vscode.lm.selectChatModels(MODEL_SELECTOR);
        if (!model) {
            throw new Error("Copilot model not available");
        }

        const prompt = givePrompt(codeConfig);
        if (prompt === "Error") {
            throw new Error("Invalid configuration");
        }
        
        const messages = [
            vscode.LanguageModelChatMessage.User(`${prompt}`),
            vscode.LanguageModelChatMessage.User(`Given the following ${fileType} code:\n\n${textBetweenMarkers}`)
        ];

        const chatResponse = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
        let updatedText = '';
        for await (const fragment of chatResponse.text) {
            updatedText += fragment;
        }
        return extractCodeBlock(updatedText);
    } catch (err) {
        if (err instanceof vscode.LanguageModelError) {
            console.error(err.message, err.code, err.cause);
            throw new Error("Error communicating with Copilot");
        }
        throw err;
    }
}

async function removeMarkersAndUpdate(document, inputText, updatedText, startIdx, endIdx, marker, endMarker) {
    const edit = new vscode.WorkspaceEdit();

    // Remove markers
    const markerRange = new vscode.Range(
        document.positionAt(startIdx - marker.length),
        document.positionAt(startIdx)
    );
    const endMarkerRange = new vscode.Range(
        document.positionAt(endIdx),
        document.positionAt(endIdx + endMarker.length)
    );
    edit.delete(document.uri, markerRange);
    edit.delete(document.uri, endMarkerRange);

    await vscode.workspace.applyEdit(edit);

    // Update content
    const contentRange = new vscode.Range(
        document.positionAt(startIdx - marker.length),
        document.positionAt(endIdx)
    );
    edit.replace(document.uri, contentRange, updatedText);

    await vscode.workspace.applyEdit(edit);
}

function createConfigViewWebview(context) {
    return {
        resolveWebviewView(webviewView) {
            webviewView.webview.options = { enableScripts: true };
            webviewView.webview.html = getWebviewContent(context);
            webviewView.webview.onDidReceiveMessage(message => handleWebviewMessage(message, context, webviewView));
        }
    };
}

function getWebviewContent(context) {
    const filePath = path.join(context.extensionPath, "webview.html");
    return fs.readFileSync(filePath, "utf8");
}

async function handleWebviewMessage(message, context, webviewView) {
    switch (message.type) {
        case "loadConfig":
            loadConfig(context, webviewView);
            break;
        case "checkboxChange":
            updateCheckboxConfig(context, message);
            break;
    }
}

function loadConfig(context, webviewView) {
    const codeConfig = context.globalState.get("codeConfig", {
        "generate-comments": false,
        "fix-bugs": true,
        "optimize-code": false,
        "generate-code": false,
    });
    webviewView.webview.postMessage({ type: "configLoaded", codeConfig });
}

function updateCheckboxConfig(context, message) {
    const codeConfig = context.globalState.get("codeConfig", {
        "generate-comments": false,
        "fix-bugs": true,
        "optimize-code": false,
        "generate-code": false,
    });
    codeConfig[message.id] = message.checked;
    context.globalState.update("codeConfig", codeConfig);
    vscode.window.showInformationMessage(`${message.id} changed to ${message.checked}`);
}

const copilotChatHandler = async (request, context, stream, token) => {
    try {
        const [model] = await vscode.lm.selectChatModels(MODEL_SELECTOR);
        if (model) {
            const messages = [
                vscode.LanguageModelChatMessage.User("You are an AI assistant for Code++. Your job is to help with provide code, fix bugs, write detailed comments and optimize code."),
                vscode.LanguageModelChatMessage.User(request.prompt)
            ];

            const chatResponse = await model.sendRequest(messages, {}, token);
            for await (const fragment of chatResponse.text) {
                stream.markdown(fragment);
            }
        }
    } catch(err) {
        handleCopilotError(err, stream);
    }

    return { metadata: { command: '' } };
};

function handleCopilotError(err, stream) {
    if (err instanceof vscode.LanguageModelError) {
        console.error(err.message, err.code, err.cause);
        stream.markdown("I'm sorry, I encountered an error while processing your request. Please try again later.");
    } else {
        throw err;
    }
}

module.exports = { activate };