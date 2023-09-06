package y1rn.javaformat;

import com.github.difflib.DiffUtils;
import com.github.difflib.patch.AbstractDelta;
import com.github.difflib.patch.Patch;
import com.github.difflib.patch.PatchFailedException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.logging.Level;
import lombok.extern.java.Log;

@Log
public class Differ {

  private Differ() {}

  public static List<TextEdit> getTextEdit(String fileString1, String fileString2, String sep)
      throws PatchFailedException {
    return getTextEdit(
        Arrays.asList(fileString1.split(sep, -1)), Arrays.asList(fileString2.split(sep, -1)), sep);
  }

  public static List<TextEdit> getTextEdit(List<String> file1, List<String> file2, String sep)
      throws PatchFailedException {
    List<TextEdit> edits = new ArrayList<>();

    Patch<String> patch = DiffUtils.diff(file1, file2);
    for (AbstractDelta<String> delta : patch.getDeltas()) {

      String text = null;
      int line = delta.getSource().getPosition() - 1;
      int endLine = line + delta.getSource().size();
      int startChar = file1.get(line).length();
      int endChar = file1.get(endLine).length();

      switch (delta.getType()) {
        case DELETE:
          text = "";
          break;
        case INSERT:
          text = toString(delta.getTarget().getLines(), sep);
          endLine = line;
          break;
        case CHANGE:
          text = toString(delta.getTarget().getLines(), sep);
          break;
        default:
          continue;
      }
      edits.add(new TextEdit(text, line, startChar, endLine, endChar));
    }

    log.info(
        () -> {
          if (log.isLoggable(Level.INFO)) {
            return edits.toString();
          }
          return null;
        });
    return edits;
  }

  public static String toString(List<String> src, String sep) {
    if (src == null) {
      return null;
    }
    StringBuilder rs = new StringBuilder();
    for (String s : src) {
      rs.append(sep);
      rs.append(s);
    }
    return rs.toString();
  }
}

