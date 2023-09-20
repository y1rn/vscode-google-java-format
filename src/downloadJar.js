var path = require('path');
var fs = require('fs');
var fetch = require('node-fetch');
var HttpsProxyAgent = require('https-proxy-agent');

var agent
if (process.env.https_proxy) {
  agent = new HttpsProxyAgent(process.env.https_proxy);
}

(process.argv.slice(2)).forEach(async (value, _) => {
  var filename = value.substring(value.lastIndexOf('/') + 1);
  var filePath = 'dist' + path.sep + filename;
  if (fs.existsSync(filePath)) return;
  const response = await fetch(value, { agent: agent, timeout: 20000 });

  if (!response.ok) {
    const data = await response.text();
    console.error(data)
    vscode.window.showErrorMessage(data);
    return Promise.reject();
  }
  const buffer = await response.buffer();
  await fs.promises.writeFile(filePath, buffer);
});

