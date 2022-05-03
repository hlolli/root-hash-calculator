import CryptoJS from "crypto-js";
import Base64 from "crypto-js/enc-base64.js";
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

const fromHexString = (hexString) =>
  new Uint8Array(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));

function hash(buffers) {
  const hash_ = CryptoJS.algo.SHA256.create();
  for (const buf of buffers) {
    hash_.update(CryptoJS.lib.WordArray.create(buf));
  }
  return new Uint8Array(
    fromHexString(hash_.finalize().toString(CryptoJS.enc.Hex), "hex")
  );
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
  return btoa(String.fromCharCode.apply(null, leave.id))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

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
  if (typeof window !== "undefined") {
    if (bufferOrStream instanceof Uint8Array) {
      return chunksFromBuffer(bufferOrStream);
    } else {
      throw new Error("unexpected/unknown bufferOrStream");
    }
  } else {
    if (bufferOrStream instanceof Buffer) {
      return chunksFromBuffer(bufferOrStream);
    } else {
      throw new Error("unexpected/unknown bufferOrStream");
    }
  }
}

export default calculateDataRoot;
