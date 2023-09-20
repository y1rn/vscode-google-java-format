const hpa = require('https-proxy-agent');
const fetch = require('node-fetch');
const fs = require('fs');
const sep = require('path').sep;


const githubInfoUrl = (repo) => `https://api.github.com/repos/${repo}/releases/latest`;
const githubDownloadUrl = (repo, file) => `https://github.com/${repo}/releases/download/${file}`;

var envAgent
if (process.env.https_proxy) {
  envAgent = new hpa.HttpsProxyAgent(process.env.https_proxy);
}

module.exports = async function(path, repo, file, versionPattern, agent) {


  var filePath = path + sep + file;
  if (fs.existsSync(filePath)) {
    return Promise.resolve(filePath)
  }

  var agent
  if (!agent) {
    agent = envAgent;
  }

  // if (vscode){
  //   const httpCfg = workspace.getConfiguration("http", null);
  //   if (httpCfg.proxy) {
  //     agent = new HttpsProxyAgent(httpCfg.proxy);
  //   }
  // }

  var downloadUrl;
  if (versionPattern) {
    try {
      const response = await fetch(githubInfoUrl(repo), {
        headers: { "Content-Type": "application/json" },
        method: "GET",
        agent: agent,
        timeout: 5000,
      });
      if (!response.ok) {
        const data = await response.text();
        return Promise.reject(data);
      }
      const data = await response.json();
      for (const asset of data.assets) {
        if (asset.browser_download_url.match(`^.*${versionPattern}/${file}$`)) {
          downloadUrl = asset.browser_download_url;
          break;
        }
      }
    } catch (error) {
      return Promise.reject(error);
    }
  } else {
    return Promise.reject('please specify version');
  }

  if (downloadUrl) {
    try {
      const response = await fetch(downloadUrl, { agent: agent, timeout: 20000 });

      if (!response.ok) {
        const data = await response.text();
        console.error(data)
        return Promise.reject();
      }
      const buffer = await response.buffer();
      await fs.promises.writeFile(filePath, buffer);
      return Promise.resolve(filePath)
    } catch (error) {
      return Promise.reject(error);
    }
  }
  return Promise.reject("fail to get download url");
}

