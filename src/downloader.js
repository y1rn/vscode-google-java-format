const hpa = require('https-proxy-agent');
const fetch = require('node-fetch').default;
const fs = require('fs');
const sep = require('path').sep;


const githubInfoUrl = (repo) => `https://api.github.com/repos/${repo}/releases/latest`;
const githubDownloadUrl = (repo, file) => `https://github.com/${repo}/releases/download/${file}`;

const SERVICE_VERSION = 'v0\\.0\\.[0-9]+';

let envAgent
if (process.env.https_proxy) {
  envAgent = new hpa.HttpsProxyAgent(process.env.https_proxy);
}

module.exports = async function(path, repo, file, currentVersion, agent) {

  let filePath = path + sep + file;
  let fileExist = fs.existsSync(filePath);
  if (fileExist && !currentVersion) {
    return Promise.resolve({path: filePath, version: null})
  }

  if (!agent && envAgent) {
    agent = envAgent;
  }

  let downloadUrl;
  let version;

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
      const group = asset.browser_download_url.match(`(${SERVICE_VERSION}?)/${file}$`)
      if (group) {
        version = group[1];
        if (version == currentVersion && fileExist) {
          return Promise.resolve({
            path: filePath,
            version: currentVersion,
          })
        }
        downloadUrl = asset.browser_download_url;
        break;
      }
    }
  } catch (error) {
    return Promise.reject(error);
  }
 
  if (downloadUrl) {
    try {
      const response = await fetch(downloadUrl, { agent: agent, timeout: 30000 });

      if (!response.ok) {
        const data = await response.text();
        console.error(data)
        return Promise.reject(data);
      }
      const buffer = await response.buffer();
      await fs.promises.writeFile(filePath, buffer);
      return Promise.resolve({
        path: filePath,
        version: version,
      })
    } catch (error) {
      return Promise.reject(error);
    }
  }
  return Promise.reject(new Error("fail to get download url"));
}

