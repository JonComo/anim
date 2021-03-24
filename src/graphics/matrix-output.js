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

export default class MatrixOutput {
  constructor(matrix, padding = 16) {
    this.generateMatrix(matrix, padding);
  }

  generateMatrix(matrix, padding = 16) {
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

            width = rtv.ctx.measureText(str).width;
            height = parseInt(rtv.ctx.font.match(/(\d+)px/)[1], 10);

            draw = (x, y) => rtv.ctx.fillText(str, x + columnWidths[columnIndex], y);
          }

          if (columnWidths[columnIndex] === undefined || columnWidths[columnIndex] < width) {
            columnWidths[columnIndex] = width;
          }

          if (rowHeights[rowIndex] === undefined || rowHeights[rowIndex] < height) {
            rowHeights[rowIndex] = height;
          }

          return draw;
        });

        return (x, y) => columnWidths.reduce((pointerX, cw, columnIndex) => {
          drawElements[columnIndex](pointerX, y, cw);

          return pointerX + cw + padding;
        }, x + padding);
      }

      const str = row.toString();

      const rowWidth = rtv.ctx.measureText(str).width;
      if (columnWidths[0] === undefined || columnWidths[0] < rowWidth) {
        columnWidths[0] = rowWidth;
      }

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

  draw(x, y, cw = this.width) {
    rtv.ctx.save();

    rtv.ctx.textAlign = 'right';
    rtv.ctx.textBaseline = 'top';

    this.drawMatrix(x, y);

    drawBracketsNew(x, y, cw, this.height);

    rtv.ctx.restore();
  }
}
