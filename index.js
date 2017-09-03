'use strict';

let nQueens = (function () {
  // Internal state and default values
  let size = 5;
  let counter = 0;
  let board;

  function start() {
    // Start the game by resizing the board container element
    resize();

    // Clear the registry
    updateRegistry();

    // Cleanup existing board
    if (board) {
      board.destroy();
    }

    // Create a new board
    board = ChessBoard('board', {
      draggable: true,
      dropOffBoard: 'trash',
      sparePieces: true,
      pieceTheme: 'website/img/chesspieces/wikipedia/{piece}.png',
      size,
      onDragStart,
      onDragMove,
      onDrop,
    });
  }

  function updateRegistry(value) {
    // Update the registry value and status message
    if (value === undefined) {
      counter = 0;
      value = 0;
    }

    counter += value;
    const n = (size - counter);
    $('#status').text('Place ' + n + ' more Queen' + (n === 1 ? '' : 's') + ' on the board to win');
  }

  function base26Encode(column) {
    // Encode a number to Base26 using the letters a-z
    const a = 'a'.charCodeAt(0);
    const j = column % 26;
    const k = Math.floor(column / 26);
    return (k ? String.fromCharCode(k - 1 + a) : '') + String.fromCharCode(j + a);
  }

  function base26Decode(str) {
    // Decode a number from Base26 using the letters a-z
    const base = 26;
    const a = 'a'.charCodeAt(0);

    let i = 0;
    let n = 0;
    for (const c of str.split('').reverse()) {
      n += (c.charCodeAt(0) - a + 1) * Math.pow(base, i++);
    }

    return n - 1;
  }

  function parseSquare(square) {
    // Given a location in the form "<base26_column><row>"
    // Parse the string into column and row numbers
    let matches = square.match(/^([a-z]+)([0-9]+)$/);

    return {
      column: base26Decode(matches[1]),
      row: +matches[2] - 1,
    };
  }

  function squareIsOccupied(square) {
    // Return true if the location has a Queen
    return $('[data-square="' + square + '"]').children('[data-piece]').length > 0;
  }

  function squareIsValid(square) {
    // Return true if the location does not attack any Queens
    return $('.hit').length == 0;
  }

  function clearAttacks(attacker) {
    // Remove all "attack highlight" squares for the given attacker location
    if ([ 'offboard', 'spare' ].indexOf(attacker) >= 0) {
      return;
    }

    // Iterate each square that the attacker is covering
    const $el = $('[data-attacked-by~="' + attacker + '"].attack');
    $el.each(function () {
      const data = ($(this).attr('data-attacked-by') || '').split(' ').filter((v) => v && v !== attacker);
      $(this).attr('data-attacked-by', data.join(' '));

      // Remove the highlight if this square is *only* attacked by the attacker
      if (data.length === 0) {
        $(this).removeClass('attack');
      }

      // Always remove the hit class
      $(this).removeClass('hit');
    });
  }

  function setAttacks(attacker, src) {
    // Add "attack highlight" squares for the given attacker location
    // src indicates the "current location" of the attacker as it moves
    if ([ 'offboard', 'spare' ].indexOf(attacker) >= 0) {
      return;
    }

    function setAttack(square) {
      // Add the "attack highlight" to the given location
      const $el = $('[data-square="' + square + '"]');
      const data = ($el.attr('data-attacked-by') || '').split(' ');

      // Add the attacker to the square's metadata iif it is not already recorded
      if (data.indexOf(attacker) < 0) {
        $el.attr('data-attacked-by', data.concat(attacker).join(' '));
      }

      // Add the "attack highlight"
      $el.addClass('attack');

      // If the location is occupied by a Queen, highlight it with an additional hit class
      if (square !== src && squareIsOccupied(square)) {
        $el.addClass('hit');
      }
    }

    function setRow(row) {
      // Add "attacker highlight" to an entire row
      for (let i = 0; i < size; i++) {
        const square = base26Encode(i) + (row + 1);
        setAttack(square);
      }
    }

    function setColumn(column) {
      // Add "attacker highlight" to an entire column
      for (let i = 0; i < size; i++) {
        const square = base26Encode(column) + (i + 1);
        setAttack(square);
      }
    }

    // TODO: Simplify these four functions into one
    function setDiagonalNW(square) {
      // Add "attacker highlight" to the entire north-west diagonal
      const source = parseSquare(square);
      source.column--;
      source.row--;
      while (source.column >= 0 && source.row >= 0) {
        const square = base26Encode(source.column) + (source.row + 1);
        setAttack(square);
        source.column--;
        source.row--;
      }
    }

    function setDiagonalNE(square) {
      // Add "attacker highlight" to the entire north-east diagonal
      const source = parseSquare(square);
      source.column++;
      source.row--;
      while (source.column < size && source.row >= 0) {
        const square = base26Encode(source.column) + (source.row + 1);
        setAttack(square);
        source.column++;
        source.row--;
      }
    }

    function setDiagonalSW(square) {
      // Add "attacker highlight" to the entire south-west diagonal
      const source = parseSquare(square);
      source.column--;
      source.row++;
      while (source.column >= 0 && source.row < size) {
        const square = base26Encode(source.column) + (source.row + 1);
        setAttack(square);
        source.column--;
        source.row++;
      }
    }

    function setDiagonalSE(square) {
      // Add "attacker highlight" to the entire south-east diagonal
      const source = parseSquare(square);
      source.column++;
      source.row++;
      while (source.column < size && source.row < size) {
        let square = base26Encode(source.column) + (source.row + 1);
        setAttack(square);
        source.column++;
        source.row++;
      }
    }

    // Highlight all squares that the attacker can reach
    const source = parseSquare(attacker);
    setColumn(source.column);
    setRow(source.row);
    setDiagonalNW(attacker);
    setDiagonalNE(attacker);
    setDiagonalSW(attacker);
    setDiagonalSE(attacker);
  }

  function onDragStart(src) {
    // Remove this Queen from the register
    if (src !== 'spare') {
      updateRegistry(-1);
    }
  }

  function onDragMove(dst, lastPos, src) {
    // Refresh the "attacker highlight" as a Queen moves
    clearAttacks(lastPos);

    // Special case for moving one Queen over the square occupied by another
    if (lastPos !== src && squareIsOccupied(lastPos)) {
      setAttacks(lastPos, lastPos);
    }

    // Add "attacker highlight" if the location is not currently occupied
    if (dst == src || !squareIsOccupied(dst)) {
      setAttacks(dst, src);
    }
  }

  function onDrop(src, dst) {
    // Special case for attempting to drop a Queen on a square occupied by another
    if (squareIsOccupied(dst)) {
      // Add the Queen back to the register if it hasn't moved
      if (src === dst) {
        updateRegistry(1);
      }

      // Move the Queen back to her original position
      setAttacks(src, src);
      return 'snapback';
    }

    // Special case for attempting an invalid move
    if (!squareIsValid(dst)) {
      clearAttacks(dst);

      // Reset the Queen iif it was moved from an existing location on the board
      if (src !== 'spare') {
        updateRegistry(1);
        setAttacks(src, src);
      }

      return 'snapback';
    }

    // The move was valid, add it to the registry and check the win condition
    if (dst !== 'offboard') {
      updateRegistry(1);

      if (counter >= size) {
        // A WINNER IS YOU!
        next();
      }
    }
  }

  function restart() {
    // Restart the game
    size = 5;
    start();
  }

  function next() {
    // Advance to the next board
    size++;
    start();
  }

  function clear() {
    // Remove all Queens from the board and reset the registry
    board.clear();

    $('.attack')
      .removeClass('attack')
      .removeClass('hit')
      .attr('data-attacked-by', '');

    updateRegistry();
  }

  function resize() {
    // Resize the board container element
    // XXX: chessboard.js does not play well with fractional square sizes
    $('#board').css('width', (size * Math.max(50 - size, 25)) + 'px');
  }

  // Begin the game
  start();

  // Expose the public API
  return {
    start,
    restart,
    clear,
    next,
  };
})();
