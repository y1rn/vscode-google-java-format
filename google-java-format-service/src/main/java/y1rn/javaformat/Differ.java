package y1rn.javaformat;

import com.github.difflib.DiffUtils;
// import com.github.difflib.algorithm.myers.MeyersDiffWithLinearSpace;
import com.github.difflib.patch.AbstractDelta;
import com.github.difflib.patch.Chunk;
import com.github.difflib.patch.Patch;
import com.github.difflib.patch.PatchFailedException;
import java.util.ArrayList;
import java.util.Arrays;
// import java.util.Collections;
import java.util.List;

public class Differ {

  static final String SEP = "\n";
  // static {
  //   DiffUtils.withDefaultDiffAlgorithmFactory(MeyersDiffWithLinearSpace.factory());
  // }

  public static List<TextEdit> getTextEdit(String fileString1, String fileString2)
      throws PatchFailedException {
    return getTextEdit(
        Arrays.asList(fileString1.split(SEP, -1)), Arrays.asList(fileString2.split(SEP, -1)));
  }

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
          // List<String> lines = delta.getSource().getLines();
          // int endChar = lines.get(lines.size()-1).length();
          endLine = line + delta.getSource().size();
          text = "";
          edits.add(new TextEdit(text, line, 0, endLine, endLine >= file1.size()?1:0));
          break;
        case INSERT:
      
          text = toString(delta.getTarget().getLines(), SEP, line == file1.size());
          edits.add(new TextEdit(text, line, 0, line, 0));
          break;
        case CHANGE:
          Chunk<String> source = delta.getSource();
          endLine = line + source.size();
          text = toString(delta.getTarget().getLines(), SEP, endLine == file1.size());
          edits.add(new TextEdit(text, line, 0, endLine, 0));
          break;
        default:
          break;
      }
    }
    // Collections.reverse(edits);
    return edits;
  }

  public static String toString(List<String> src, String sep, boolean includeEndOfLine) {
    if (src == null) {
      return null;
    }
    if (!includeEndOfLine) {
      StringBuffer rs = new StringBuffer();
      for (String s : src) {
        rs.append(s);
        rs.append(sep);
      }
      return rs.toString();
    }
    return String.join(sep, src);
  }
}

