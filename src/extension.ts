// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import fetch from "node-fetch";
import * as fs from "fs";
import { HttpsProxyAgent } from 'https-proxy-agent';
import * as net from "net";
import { LOADIPHLPAPI } from "dns";
import * as cp from "child_process";
import { platform } from 'os'
import { delimiter, sep } from 'path'



const GoogleJavaFormatInfoUrl = "https://api.github.com/repos/google/google-java-format/releases/latest";
const LocalJarFile = "google-java-format-service.jar";
var PROCESS:cp.ChildProcessWithoutNullStreams;
var PORT:number;


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated

  if (!fs.existsSync(context.globalStorageUri.fsPath)) {
    fs.mkdir(context.globalStorageUri.fsPath, (error: any) => error ? console.log(error) : console.log('You have created the' + context.globalStorageUri.fsPath));
  }
  const filePath = context.globalState.get("gjfs.jar-file");
  if (!filePath || filePath == "" || !fs.existsSync(filePath.toString())) {
    downloadJar(context).then(() => { 
      starService(context);
    })
  }else {
    starService(context);
  }
  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.languages.registerDocumentRangeFormattingEditProvider(
    { scheme: "file", language: "java" },
    {
      provideDocumentRangeFormattingEdits(
        document: vscode.TextDocument,
        range: vscode.Range,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
      ): Promise<vscode.TextEdit[]> {
        if (range.isEmpty) {
          return Promise.resolve([]);
        }
        return getResp(document, range);
      },
    }
  );
  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
  if (PROCESS != null && !PROCESS.killed) {
    console.log(`kill process  : ${PROCESS.pid}`);
    PROCESS.kill();
    process.kill(PROCESS.pid, 'SIGINT');
    PROCESS.disconnect();
  }
}

async function getResp(
  document: vscode.TextDocument,
  range: vscode.Range
): Promise<vscode.TextEdit[]> {
  if (PORT <= 0) {
    Promise.reject([])
  }
  const cfg = vscode.workspace.getConfiguration("gjfs");
  const response = await fetch(`http://localhost:${PORT}/files`, {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      skipSortingImports: cfg.get("skipSortingImports"),
      skipRemovingUnusedImports: cfg.get("skipRemovingUnusedImports"),
      styleName: cfg.get("style"),
      data: document.getText(range),
    }),
    method: "POST",
  });
  const data = await response.text();
  
  if (!response.ok || !data) {
    vscode.window.showErrorMessage(data);
    return Promise.reject([]);
  }
  return Promise.resolve([vscode.TextEdit.replace(range, data)]);
}

async function starService(context: vscode.ExtensionContext): Promise<void> {
  const googleJarPath = context.globalState.get("gjfs.jar-file");
  if (!googleJarPath) {
    return Promise.reject();
  }

  // PORT = 8030;

  PORT = await getPortFree();
  if (PORT <= 0) {
    return Promise.reject();
  }
  const localJarPath = context.extensionPath + sep + "dist" + sep + LocalJarFile;

  PROCESS = cp.spawn("java", ['-cp', `\"${localJarPath}${delimiter}${googleJarPath}\"`, 
    '--add-exports=jdk.compiler/com.sun.tools.javac.api=ALL-UNNAMED', 
    '--add-exports=jdk.compiler/com.sun.tools.javac.file=ALL-UNNAMED', 
    '--add-exports=jdk.compiler/com.sun.tools.javac.parser=ALL-UNNAMED', 
    '--add-exports=jdk.compiler/com.sun.tools.javac.tree=ALL-UNNAMED', 
    '--add-exports=jdk.compiler/com.sun.tools.javac.util=ALL-UNNAMED', 
    'cn.gjfs.App', 
    `-p=${PORT}` 
    ],{
      shell: true,
      cwd: context.extensionPath,
    });
  console.log(`service listening on port : ${PORT}`);

  PROCESS.stderr.on('data', (data) => {
    console.log(`google java format: ${data}`);
  });
  
}

async function downloadJar(context: vscode.ExtensionContext): Promise<void>{
  const httpCfg = vscode.workspace.getConfiguration("http");
  var agent
  if (httpCfg.proxy) {
    agent = new HttpsProxyAgent(httpCfg.proxy);
  }

  const response = await fetch(GoogleJavaFormatInfoUrl, {
    headers: { "Content-Type": "application/json" },
    method: "GET",
    agent: agent,
  });
  const data = await response.json();
  if (!response.ok) {
    vscode.window.showErrorMessage(data);
    return Promise.reject();
  }
  var  downloadUrl;
  for (const asset of data.assets) {
    if (asset.name.match("^google-java-format-[0-9]+\.[0-9]+\.[0-9]+-all-deps.jar$")) {
      downloadUrl = asset.browser_download_url;
      context.globalState.update("gjfs.jar-file", context.globalStorageUri.fsPath + sep + asset.name);
      break;
    }
  }

  const filePath = context.globalState.get("gjfs.jar-file");

  if (!filePath) return Promise.reject();

  if (fs.existsSync(filePath.toString())) {
    return Promise.resolve();
  }

  if (downloadUrl) {
    console.log(`download file from url [${downloadUrl}]`);
 
    const response = await fetch(downloadUrl, { agent: agent });
    
    if (!response.ok) {
      const data = await response.text();
      console.error(data)
      vscode.window.showErrorMessage(data);
      return Promise.reject();
    }
    const buffer = await response.buffer();
    await fs.promises.writeFile(filePath.toString(), buffer);
    console.log(`file [${filePath}] downloaded`);
    return Promise.resolve()

  }

  return Promise.reject()
}


async function getPortFree():Promise<number>{
  return new Promise<number>(res => {
    const srv = net.createServer();
    if (srv != null) {
      srv.listen(0, () => {
        const addrInfo  = srv.address()
        if (addrInfo) {
          const port = (addrInfo as net.AddressInfo).port;
          srv.close((err) => res(port))
        }
      });
    }
  })
}