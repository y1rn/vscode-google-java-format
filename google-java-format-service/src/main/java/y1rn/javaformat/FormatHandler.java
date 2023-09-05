package y1rn.javaformat;

import com.google.googlejavaformat.Newlines;
import com.google.googlejavaformat.java.Formatter;
import com.google.googlejavaformat.java.ImportOrderer;
import com.google.googlejavaformat.java.JavaFormatterOptions;
import com.google.googlejavaformat.java.RemoveUnusedImports;
import java.io.OutputStream;
import java.util.List;
import org.eclipse.lsp4j.jsonrpc.JsonRpcException;
import org.eclipse.lsp4j.jsonrpc.MessageIssueException;
import org.eclipse.lsp4j.jsonrpc.json.MessageJsonHandler;
import org.eclipse.lsp4j.jsonrpc.json.StreamMessageConsumer;
import org.eclipse.lsp4j.jsonrpc.messages.Message;
import org.eclipse.lsp4j.jsonrpc.messages.RequestMessage;
import org.eclipse.lsp4j.jsonrpc.messages.ResponseMessage;

public class FormatHandler extends StreamMessageConsumer {

  public FormatHandler(OutputStream output, MessageJsonHandler jsonHandler) {
    super(output, jsonHandler);
  }

  @Override
  public void consume(Message message) throws MessageIssueException, JsonRpcException {
    try {
      RequestMessage request = (RequestMessage) message;
      Request req = (Request) request.getParams();
      JavaFormatterOptions options = JavaFormatterOptions.builder().style(req.getStyle()).build();
      String input = req.getData();
      String output = new Formatter(options).formatSource(input);
      if (!req.isSkipRemovingUnusedImports()) {
        output = RemoveUnusedImports.removeUnusedImports(output);
      }
      if (!req.isSkipSortingImports()) {
        output = ImportOrderer.reorderImports(output, req.getStyle());
      }
      String sep = Newlines.guessLineSeparator(input);
      List<TextEdit> respResult = Differ.getTextEdit(input, output, sep);

      ResponseMessage resp = new ResponseMessage();
      resp.setId(Integer.parseInt(request.getId()));
      resp.setResult(respResult);
      super.consume(resp);

    } catch (Exception e) {
      throw new JsonRpcException(e);
    }
  }
}
