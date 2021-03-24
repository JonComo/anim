import { drawPath } from '../index';
import { rtv } from '../resources';

export function drawBracketsNew(x, y, width, height, fingerLength = 8) {
  drawPath([
    [x + fingerLength, y],
    [x, y],
    [x, y + height],
    [x + fingerLength, y + height],
  ]);

  drawPath([
    [x + width - fingerLength, y],
    [x + width, y],
    [x + width, y + height],
    [x + width - fingerLength, y + height],
  ]);
}

export function getTextWidth(text) {
  return rtv.ctx.measureText(text).width;
}

export default class MatrixOutput {
  constructor(matrix, padding = 16) {
    const columnWidths = [];
    const rowHeights = [];

    const drawRows = matrix.map((row, rowIndex) => {
      if (row instanceof Array) {
        const drawElements = row.map((element, columnIndex) => {
          let width;
          let height;
          let draw;

          if (element instanceof Array) {
            const childMatrix = new MatrixOutput(element);
            ({ width, height } = childMatrix);
            draw = childMatrix.draw.bind(childMatrix);
          } else {
            const str = element.toString();

            width = getTextWidth(str);
            height = parseInt(rtv.ctx.font.match(/(\d+)px/)[1], 10);

            draw = (x, y) => rtv.ctx.fillText(str, x + columnWidths[columnIndex], y);
          }

          MatrixOutput.updateLayout(columnWidths, columnIndex, width);
          MatrixOutput.updateLayout(rowHeights, rowIndex, height);

          return draw;
        });

        return (x, y) => columnWidths.reduce((pointerX, cw, columnIndex) => {
          drawElements[columnIndex](pointerX, y, cw);

          return pointerX + cw + padding;
        }, x + padding);
      }

      const str = row.toString();

      const rowWidth = getTextWidth(str);
      MatrixOutput.updateLayout(columnWidths, 0, rowWidth);

      rowHeights[rowIndex] = parseInt(rtv.ctx.font.match(/(\d+)px/)[1], 10);

      return (x, y) => rtv.ctx.fillText(str, x + padding + columnWidths[0], y);
    });

    const drawMatrix = (x, y) => rowHeights.reduce((pointerY, rh, rowIndex) => {
      drawRows[rowIndex](x, pointerY);

      return pointerY + rh + padding;
    }, y + padding);

    this.drawMatrix = drawMatrix;

    this.width = columnWidths.reduce((a, b) => a + b + padding, padding);
    this.height = rowHeights.reduce((a, b) => a + b + padding, padding);
  }

  static updateLayout(sizes, index, newVal) {
    const oldVal = sizes[index];

    if (oldVal === undefined || oldVal < newVal) {
      sizes[index] = newVal;
    }
  }

  draw(x, y, cw = this.width) {
    rtv.ctx.save();

    rtv.ctx.textAlign = 'right';
    rtv.ctx.textBaseline = 'top';

    this.drawMatrix(x, y);

    drawBracketsNew(x, y, cw, this.height);

    rtv.ctx.restore();
  }
}
