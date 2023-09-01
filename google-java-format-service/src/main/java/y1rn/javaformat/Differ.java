package y1rn.javaformat;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import com.github.difflib.DiffUtils;
import com.github.difflib.patch.AbstractDelta;
import com.github.difflib.patch.Chunk;
import com.github.difflib.patch.Patch;
import com.github.difflib.patch.PatchFailedException;

public class Differ {
  public static List<TextEdit> getTextEdit(List<String> file1, List<String> file2)
      throws PatchFailedException {
    List<TextEdit> edits = new ArrayList<>();

    Patch<String> patch = DiffUtils.diff(file1, file2);
    for (AbstractDelta<String> delta : patch.getDeltas()) {
      String text = null;
      int line = delta.getSource().getPosition();
      int endLine;
      switch (delta.getType()) {
        case DELETE:
          endLine = line + delta.getSource().size();
          edits.add(new TextEdit(text, line, 0, endLine, 0));
          break;
        case INSERT:
          text = String.join("\n", delta.getTarget().getLines()) + "\n";
          edits.add(new TextEdit(text, line, 0, line, 0));
          break;
        case CHANGE:
          Chunk<String> source = delta.getSource();
          endLine = line + source.size();
          text = String.join("\n", delta.getTarget().getLines()) + "\n";
          edits.add(new TextEdit(text, line, 0, endLine, 0));
          break;
        default:
          break;
      }
    }
    Collections.reverse(edits);
    return edits;
  }
}
