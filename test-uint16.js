import fs from 'fs';

const buffer = fs.readFileSync('./maps/test-pattern.pmp');
const offset = 64;
const dataBytes = buffer.length - offset;
const numValues = dataBytes / 2; // 2 bytes per uint16
const size = Math.floor(Math.sqrt(numValues));

console.log(`Test lettura come UInt16: ${size}x${size}`);

// Leggi come uint16 e trova valori alti
let highValues = [];
for (let i = 0; i < Math.min(size * size, 10000); i++) {
  const value = buffer.readUInt16LE(offset + i * 2);
  if (value > 1000) {
    const row = Math.floor(i / size);
    const col = i % size;
    highValues.push({ row, col, value });
  }
}

console.log(`Valori alti (>1000): ${highValues.length}`);
highValues.slice(0, 20).forEach(v => {
  console.log(`[${v.row}, ${v.col}] = ${v.value}`);
});

// Test pattern geometrici
console.log('\nPattern montagna (basso-sinistra):');
for (let row = size - 50; row < size; row++) {
  let line = '';
  for (let col = 0; col < 50; col++) {
    const index = row * size + col;
    const value = buffer.readUInt16LE(offset + index * 2);
    line += value > 1000 ? '#' : '.';
  }
  console.log(line);
}