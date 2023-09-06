package y1rn.javaformat;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableRangeSet;
import com.google.common.collect.Range;
import com.google.common.collect.RangeSet;
import com.google.googlejavaformat.Newlines;
import com.google.googlejavaformat.java.Formatter;
import com.google.googlejavaformat.java.ImportOrderer;
import com.google.googlejavaformat.java.JavaFormatterOptions;
import com.google.googlejavaformat.java.RemoveUnusedImports;

import lombok.extern.java.Log;

import java.io.OutputStream;
import java.util.List;
import java.util.logging.Level;

import org.eclipse.lsp4j.jsonrpc.JsonRpcException;
import org.eclipse.lsp4j.jsonrpc.MessageIssueException;
import org.eclipse.lsp4j.jsonrpc.json.MessageJsonHandler;
import org.eclipse.lsp4j.jsonrpc.json.StreamMessageConsumer;
import org.eclipse.lsp4j.jsonrpc.messages.Message;
import org.eclipse.lsp4j.jsonrpc.messages.RequestMessage;
import org.eclipse.lsp4j.jsonrpc.messages.ResponseMessage;

@Log
public class FormatHandler extends StreamMessageConsumer {

  public FormatHandler(OutputStream output, MessageJsonHandler jsonHandler) {
    super(output, jsonHandler);
  }

  @Override
  public void consume(Message message) throws MessageIssueException, JsonRpcException {
    try {
      RequestMessage request = (RequestMessage) message;
      Request req = (Request) request.getParams();
      log.info(
          () -> {
            if (log.isLoggable(Level.INFO)) {
              return "request: " + req.toString();
            }
            return null;
          });
      JavaFormatterOptions options = JavaFormatterOptions.builder().style(req.getStyle()).build();
      String input = req.getData();
      Formatter formatter= new Formatter(options);
      String output = null;
      if (req.getRange() != null) {
        RangeSet<Integer> range = Formatter.lineRangesToCharRanges(input,ImmutableRangeSet.of(Range.openClosed(req.getRange().getStart(), req.getRange().getEnd())));
        output = formatter.formatSource(input,range.asRanges());
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
