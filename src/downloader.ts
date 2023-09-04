import * as vscode from "vscode";
import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch from "node-fetch";
import * as fs from "fs";
import { sep } from 'path'


const GOOGLE_JAVA_FORMAT_INFO_URL = "https://api.github.com/repos/google/google-java-format/releases/latest";


export async function downloadGJF(context: vscode.ExtensionContext, progress: vscode.Progress<any>): Promise<void> {
  const httpCfg = vscode.workspace.getConfiguration("http", null);
  var agent
  if (httpCfg.proxy) {
    agent = new HttpsProxyAgent(httpCfg.proxy);
  }
  var downloadUrl;
  var filePath;
  try {
    const response = await fetch(GOOGLE_JAVA_FORMAT_INFO_URL, {
      headers: { "Content-Type": "application/json" },
      method: "GET",
      agent: agent,
      timeout: 5000,
    });
    if (!response.ok) {
      const data = await response.text();
      vscode.window.showErrorMessage(data);
      return Promise.reject();
    }
    const data = await response.json();
    for (const asset of data.assets) {
      if (asset.name.match("^google-java-format-[0-9]+\.[0-9]+\.[0-9]+-all-deps.jar$")) {
        downloadUrl = asset.browser_download_url;
        progress.report({ message: `found ${asset.name}` });
        filePath = context.globalStorageUri.fsPath + sep + asset.name;
        break;
      }
    }
  } catch (error) {
    vscode.window.showErrorMessage("fail to get google-java-format jar file info, try to set proxy with [http.proxy]");
    return Promise.reject();
  }


  if (!filePath) return Promise.reject();

  if (fs.existsSync(filePath.toString())) {
    context.globalState.update("google-java-format.jar-file", filePath);
    return Promise.resolve();
  }

  if (downloadUrl) {
    try {
      setTimeout(() => {
        progress.report({ message: "downloading" });
      }, 1000);

      const response = await fetch(downloadUrl, { agent: agent, timeout: 20000});

      if (!response.ok) {
        const data = await response.text();
        console.error(data)
        vscode.window.showErrorMessage(data);
        return Promise.reject();
      }
      const buffer = await response.buffer();
      await fs.promises.writeFile(filePath.toString(), buffer);
      context.globalState.update("google-java-format.jar-file", filePath);
      return Promise.resolve()
    } catch (error) {
      vscode.window.showErrorMessage("fail to download google-java-format jar file, try to set proxy with [http.proxy]");
    }
  }

  return Promise.reject()
}