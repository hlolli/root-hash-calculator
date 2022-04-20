import crypto from "node:crypto";
import { addIndex, map, pipe, reduce, splitEvery } from "ramda";

const mapIndexed = addIndex(map);

const MAX_CHUNK_SIZE = 256 * 1024;
const MIN_CHUNK_SIZE = 32 * 1024;
const NOTE_SIZE = 32;

function intToBuffer(note) {
  const buffer = new Uint8Array(NOTE_SIZE);
  for (let i = buffer.length - 1; i >= 0; i--) {
    const byte = note % 256;
    buffer[i] = byte;
    note = (note - byte) / 256;
  }
  return buffer;
}

function hash(buffers) {
  const hash_ = crypto.createHash("sha256");
  for (const buf of buffers) {
    hash_.update(buf);
  }
  return new Uint8Array(Buffer.from(hash_.digest(), "hex"));
}

function hashBranch(left, right) {
  if (!right) {
    return left;
  } else {
    return {
      id: hash([
        hash([left.id]),
        hash([right.id]),
        hash([intToBuffer(left.cursor)]),
      ]),
      cursor: right.cursor,
    };
  }
}

function buildLayers(nodes, level = 0) {
  if (nodes.length < 2) {
    return nodes[0];
  }

  const nextLayer = [];

  for (let i = 0; i < nodes.length; i += 2) {
    nextLayer.push(hashBranch(nodes[i], nodes[i + 1]));
  }

  return buildLayers(nextLayer, level + 1);
}

function leave2Base64(leave) {
  return Buffer.from(leave.id).toString("base64url");
}

// function logRoot(leave) {
//   process.stdout.write(Buffer.from(leave.id).toString("base64url"));
// }

function chunksFromBuffer(buffer) {
  return pipe(
    splitEvery(MAX_CHUNK_SIZE),
    mapIndexed((buf, index) => {
      const cursor = buf.length + index * MAX_CHUNK_SIZE;
      const cursorBuffer = intToBuffer(cursor);
      const hashedBuf = hash([buf]);
      const hash_ = hash([hash([hashedBuf]), hash([cursorBuffer])]);

      return {
        cursor,
        id: hash_,
      };
    }),
    buildLayers,
    leave2Base64
  )(buffer);
}

function calculateDataRoot(bufferOrStream) {
  if (bufferOrStream instanceof Buffer) {
    return chunksFromBuffer(bufferOrStream);
  }
}

export default calculateDataRoot;
