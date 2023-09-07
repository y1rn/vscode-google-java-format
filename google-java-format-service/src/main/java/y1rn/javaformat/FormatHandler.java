package y1rn.javaformat;

import com.google.common.collect.ImmutableRangeSet;
import com.google.common.collect.Range;
import com.google.common.collect.RangeSet;
import com.google.googlejavaformat.Newlines;
import com.google.googlejavaformat.java.Formatter;
import com.google.googlejavaformat.java.ImportOrderer;
import com.google.googlejavaformat.java.JavaFormatterOptions;
import com.google.googlejavaformat.java.RemoveUnusedImports;
import java.io.OutputStream;
import java.util.List;
import java.util.logging.Level;
import lombok.extern.java.Log;
import org.eclipse.lsp4j.jsonrpc.JsonRpcException;
import org.eclipse.lsp4j.jsonrpc.MessageIssueException;
import org.eclipse.lsp4j.jsonrpc.json.MessageJsonHandler;
import org.eclipse.lsp4j.jsonrpc.json.StreamMessageConsumer;
import org.eclipse.lsp4j.jsonrpc.messages.Message;
import org.eclipse.lsp4j.jsonrpc.messages.RequestMessage;
import org.eclipse.lsp4j.jsonrpc.messages.ResponseError;
import org.eclipse.lsp4j.jsonrpc.messages.ResponseMessage;

@Log
public class FormatHandler extends StreamMessageConsumer {

  public FormatHandler(OutputStream output, MessageJsonHandler jsonHandler) {
    super(output, jsonHandler);
  }

  @Override
  public void consume(Message message) throws MessageIssueException, JsonRpcException {
    RequestMessage request = (RequestMessage) message;
    Request req = (Request) request.getParams();
    String requestId = request.getId();
    List<TextEdit> respResult = null;
    log.info(
        () -> {
          if (log.isLoggable(Level.INFO)) {
            return "request: " + req.toString();
          }
          return null;
        });
    try {
      JavaFormatterOptions options = JavaFormatterOptions.builder().style(req.getStyle()).build();
      String input = req.getData();
      Formatter formatter = new Formatter(options);
      String output = null;
      if (req.getRange() != null) {
        RangeSet<Integer> range =
            Formatter.lineRangesToCharRanges(
                input,
                ImmutableRangeSet.of(
                    Range.openClosed(req.getRange().getStart(), req.getRange().getEnd())));
        output = formatter.formatSource(input, range.asRanges());
      } else {
        output = formatter.formatSource(input);

        if (!req.isSkipRemovingUnusedImports()) {
          output = RemoveUnusedImports.removeUnusedImports(output);
        }
        if (!req.isSkipSortingImports()) {
          output = ImportOrderer.reorderImports(output, req.getStyle());
        }
      }
      String sep = Newlines.guessLineSeparator(input);
      respResult = Differ.getTextEdit(input, output, sep);
    } catch (Exception e) {
      ResponseMessage resp = new ResponseMessage();
      resp.setId(Integer.parseInt(requestId));
      resp.setError(new ResponseError(400, e.getMessage(), null));
      super.consume(resp);
      throw new JsonRpcException(e);
    }
    ResponseMessage resp = new ResponseMessage();
    resp.setId(Integer.parseInt(requestId));
    resp.setResult(respResult);
    super.consume(resp);
  }
}

