const axios = require("axios");

function givePrompt(config) {
  const fixBugs = config["fix-bugs"] ? '1' : '0';
  const generateComments = config["generate-comments"] ? '1' : '0';
  const optimizeCode = config["optimize-code"] ? '1' : '0';
  const generateCode = config["generate-code"] ? '1' : '0';

  const result = parseInt(fixBugs + generateComments + optimizeCode + generateCode, 2);

  switch(result) {
      case 0:
          return "Error";
      case 1:
          return "IMPORTANT respond just with code. Do not use markdown. Generate code for the following requirements:";
      case 2:
          return "IMPORTANT respond just with code. Do not use markdown. Optimize the following code (by reducing time complexity. For ex, using Stirling Approximation for Factorial, Binet Formula for Fibonacci etc.):";
      case 3:
          return "IMPORTANT respond just with code. Do not use markdown. Optimize the following code (by reducing time complexity. For ex, using Stirling Approximation for Factorial, Binet Formula for Fibonacci etc.) and generate new code for any missing functionality:";
      case 4:
          return "IMPORTANT respond just with code. Do not use markdown. Add comments to the following code:";
      case 5:
          return "IMPORTANT respond just with code. Do not use markdown. Add comments to the following code and generate new code for any missing functionality:";
      case 6:
          return "IMPORTANT respond just with code. Do not use markdown. Optimize the following code (by reducing time complexity. For ex, using Stirling Approximation for Factorial, Binet Formula for Fibonacci etc.) and add comments:";
      case 7:
          return "IMPORTANT respond just with code. Do not use markdown. Optimize the following code (by reducing time complexity. For ex, using Stirling Approximation for Factorial, Binet Formula for Fibonacci etc.), add comments, and generate new code for any missing functionality:";
      case 8:
          return "IMPORTANT respond just with code. Do not use markdown. Fix bugs in the following code:";
      case 9:
          return "IMPORTANT respond just with code. Do not use markdown. Fix bugs in the following code and generate new code for any missing functionality:";
      case 10:
          return "IMPORTANT respond just with code. Do not use markdown. Fix bugs and Optimize the following code (by reducing time complexity. For ex, using Stirling Approximation for Factorial, Binet Formula for Fibonacci etc.):";
      case 11:
          return "IMPORTANT respond just with code. Do not use markdown. Fix bugs, Optimize the following code (by reducing time complexity. For ex, using Stirling Approximation for Factorial, Binet Formula for Fibonacci etc.), and generate new code for any missing functionality:";
      case 12:
          return "IMPORTANT respond just with code. Do not use markdown. Fix bugs and add comments to the following code:";
      case 13:
          return "IMPORTANT respond just with code. Do not use markdown. Fix bugs, add comments to the following code, and generate new code for any missing functionality:";
      case 14:
          return "IMPORTANT respond just with code. Do not use markdown. Fix bugs, optimize (by reducing time complexity. For ex, using Stirling Approximation for Factorial, Binet Formula for Fibonacci etc.), and add comments to the following code:";
      case 15:
          return "IMPORTANT respond just with code. Do not use markdown. Fix bugs, optimize (by reducing time complexity. For ex, using Stirling Approximation for Factorial, Binet Formula for Fibonacci etc.), add comments to the following code, and generate new code for any missing functionality:";
      default:
          return "Error";
  }
}

module.exports = givePrompt;