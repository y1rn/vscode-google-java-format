// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import fetch from "node-fetch";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "google-java-format-service" is now active!'
  );

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
export function deactivate() {}

async function getResp(
  document: vscode.TextDocument,
  range: vscode.Range
): Promise<vscode.TextEdit[]> {
  const cfg = vscode.workspace.getConfiguration("gjfs");
  const response = await fetch(`http://${cfg.get("address")}/files`, {
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
  if (!response.ok) {
    vscode.window.showErrorMessage(data);
    return Promise.resolve([]);
  }
  return Promise.resolve([vscode.TextEdit.replace(range, data)]);
}
