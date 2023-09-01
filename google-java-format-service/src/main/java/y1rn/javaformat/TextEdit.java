package y1rn.javaformat;

import lombok.Builder;
import lombok.Data;
import lombok.ToString;

@Data
@ToString
public class TextEdit {
  Range range;
  StringBuffer newText;

  public TextEdit(StringBuffer text, int startLine, int startChar, int endLine, int endChar) {

    this.newText = text;
    Position starPosition = new Position(startLine, startChar);
    Position endPosition = new Position(endLine, endChar);
    this.range = new Range(starPosition, endPosition);
  }

  @Data
  @Builder
  @ToString
  public static class Range {
    Position start;
    Position end;
  }

  @Data
  @Builder
  @ToString
  public static class Position {
    int line;
    int character;
  }
}
