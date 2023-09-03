import * as vscode from "vscode";
import * as net from "net";


export function jsonToTextEdit(data: vscode.TextEdit): vscode.TextEdit{
  const start: vscode.Position = new vscode.Position(data.range.start.line, data.range.start.character);
  const end: vscode.Position = new vscode.Position(data.range.end.line, data.range.end.character);
  const range: vscode.Range = new vscode.Range(start, end);
  const te: vscode.TextEdit = new vscode.TextEdit(range, data.newText);
  return te;
}

export async function getPortFree(): Promise<number> {
  return new Promise<number>(res => {
    const srv = net.createServer();
    if (srv != null) {
      srv.listen(0, () => {
        const addrInfo = srv.address()
        if (addrInfo) {
          const port = (addrInfo as net.AddressInfo).port;
          srv.close((err) => res(port))
        }
      });
    }
  })
}
