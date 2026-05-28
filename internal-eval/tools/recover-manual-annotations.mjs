import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const STORAGE_KEY = "endless-story-internal-annotations-v1";
const ROOT = process.cwd();
const SEARCH_DIRS = [
  path.join(ROOT, "internal-eval", "recovery", "codex-browser-localstorage-leveldb-20260526"),
  path.join(ROOT, "internal-eval", "recovery", "chrome-old-000005", "Default", "Local Storage", "leveldb"),
  path.join(os.homedir(), "AppData", "Roaming", "Codex", "Partitions", "codex-browser-app", "Local Storage", "leveldb"),
  path.join(os.homedir(), "AppData", "Roaming", "Codex", "Local Storage", "leveldb")
];

const generatedDir = path.join(ROOT, "internal-eval", "generated");
const outputPath = path.join(generatedDir, "manual-recovered-2026-05-26.json");

const utf16Needle = Buffer.from('{"cases":[', "utf16le");
const utf8Needle = Buffer.from('{"cases":[', "utf8");

main();

function main() {
  const files = unique(
    SEARCH_DIRS.flatMap(dir => listLevelDbFiles(dir))
  );
  const snapshots = [];

  for (const file of files) {
    const buffer = readFile(file);
    if (!buffer) continue;

    collectSnapshots(buffer, file, "raw", snapshots);

    if (/\.log$/i.test(file)) {
      for (const record of readLevelDbLogRecords(buffer)) {
        collectSnapshots(record.data, file, `log-record-${record.index}`, snapshots);
      }
    }

    if (/\.(ldb|sst)$/i.test(file)) {
      for (const block of readTableBlocks(buffer)) {
        collectSnapshots(block.data, file, block.kind, snapshots);
      }
    }
  }

  const uniqueSnapshots = dedupeSnapshots(snapshots)
    .sort((a, b) => b.manualReviewed - a.manualReviewed || b.reviewed - a.reviewed || b.caseCount - a.caseCount);

  const recoverable = uniqueSnapshots.find(snapshot => snapshot.manualReviewed >= 10);
  if (recoverable) {
    fs.mkdirSync(generatedDir, { recursive: true });
    const cases = recoverable.data.cases
      .filter(item => item?.label?.reviewed && !isCodexAutoLabel(item.label))
      .slice(0, 10)
      .map(item => ({
        ...item,
        source: "manual-recovered-2026-05-26",
        recoveredFrom: {
          file: path.relative(ROOT, recoverable.file),
          segment: recoverable.segment
        }
      }));

    fs.writeFileSync(outputPath, `${JSON.stringify({
      batchId: "manual-recovered-2026-05-26",
      generatedAt: new Date().toISOString(),
      label: "手动标注 10",
      source: "browser-localstorage-recovery",
      recoveredFrom: {
        file: path.relative(ROOT, recoverable.file),
        segment: recoverable.segment
      },
      cases
    }, null, 2)}\n`, "utf8");
  }

  const summary = {
    storageKey: STORAGE_KEY,
    searchedFiles: files.map(file => path.relative(ROOT, file)),
    snapshotCount: uniqueSnapshots.length,
    recoverable: recoverable ? {
      output: path.relative(ROOT, outputPath),
      file: path.relative(ROOT, recoverable.file),
      segment: recoverable.segment,
      caseCount: recoverable.caseCount,
      reviewed: recoverable.reviewed,
      manualReviewed: recoverable.manualReviewed,
      codexReviewed: recoverable.codexReviewed,
      annotators: recoverable.annotators,
      ids: recoverable.manualIds
    } : null,
    snapshots: uniqueSnapshots.map(snapshot => ({
      file: path.relative(ROOT, snapshot.file),
      segment: snapshot.segment,
      caseCount: snapshot.caseCount,
      reviewed: snapshot.reviewed,
      manualReviewed: snapshot.manualReviewed,
      codexReviewed: snapshot.codexReviewed,
      annotators: snapshot.annotators,
      manualIds: snapshot.manualIds,
      firstIds: snapshot.firstIds
    }))
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

function listLevelDbFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(name => /\.(log|ldb|sst)$/i.test(name) || /^MANIFEST-/i.test(name))
    .map(name => path.join(dir, name));
}

function readFile(file) {
  try {
    return fs.readFileSync(file);
  } catch {
    return null;
  }
}

function unique(items) {
  return [...new Set(items)];
}

function collectSnapshots(buffer, file, segment, snapshots) {
  for (const { text, encoding, offset } of extractJsonTexts(buffer)) {
    const data = parseSnapshot(text);
    if (!data) continue;
    const stats = summarizeSnapshot(data);
    snapshots.push({
      ...stats,
      data,
      file,
      segment: `${segment}:${encoding}@${offset}`
    });
  }
}

function extractJsonTexts(buffer) {
  const found = [];
  findAll(buffer, utf16Needle).forEach(offset => {
    const text = readBalancedJsonText(buffer.toString("utf16le", offset, Math.min(buffer.length, offset + 8 * 1024 * 1024)));
    if (text) found.push({ text, encoding: "utf16le", offset });
  });
  findAll(buffer, utf8Needle).forEach(offset => {
    const text = readBalancedJsonText(buffer.toString("utf8", offset, Math.min(buffer.length, offset + 8 * 1024 * 1024)));
    if (text) found.push({ text, encoding: "utf8", offset });
  });
  return found;
}

function findAll(buffer, needle) {
  const offsets = [];
  let start = 0;
  while (start < buffer.length) {
    const offset = buffer.indexOf(needle, start);
    if (offset === -1) break;
    offsets.push(offset);
    start = offset + Math.max(1, needle.length);
  }
  return offsets;
}

function readBalancedJsonText(text) {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (inString) {
      if (char === "\\") escaped = true;
      else if (char === "\"") inString = false;
      continue;
    }
    if (char === "\"") inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(0, i + 1);
    }
  }
  return "";
}

function parseSnapshot(text) {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed?.cases)) return parsed;
  } catch {
    return null;
  }
  return null;
}

function summarizeSnapshot(data) {
  const cases = Array.isArray(data.cases) ? data.cases : [];
  const reviewed = cases.filter(item => item?.label?.reviewed);
  const manual = reviewed.filter(item => !isCodexAutoLabel(item.label));
  const codex = reviewed.filter(item => isCodexAutoLabel(item.label));
  return {
    caseCount: cases.length,
    reviewed: reviewed.length,
    manualReviewed: manual.length,
    codexReviewed: codex.length,
    annotators: unique(reviewed.map(item => String(item?.label?.annotator || "")).filter(Boolean)),
    manualIds: manual.map(item => item.id).filter(Boolean),
    firstIds: cases.slice(0, 6).map(item => item?.id).filter(Boolean)
  };
}

function isCodexAutoLabel(label) {
  const annotator = String(label?.annotator || "");
  return label?.autoCompletedBy === "codex"
    || Boolean(label?.autoCompletedRevision)
    || annotator === "Codex"
    || annotator === "Codex补标";
}

function dedupeSnapshots(snapshots) {
  const seen = new Set();
  const deduped = [];
  for (const snapshot of snapshots) {
    const key = JSON.stringify({
      ids: snapshot.firstIds,
      caseCount: snapshot.caseCount,
      reviewed: snapshot.reviewed,
      manualReviewed: snapshot.manualReviewed,
      codexReviewed: snapshot.codexReviewed
    });
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(snapshot);
  }
  return deduped;
}

function readLevelDbLogRecords(buffer) {
  const records = [];
  let blockOffset = 0;
  let fragments = [];
  let index = 0;

  while (blockOffset + 7 <= buffer.length) {
    const blockEnd = Math.min(blockOffset + 32768, buffer.length);
    let offset = blockOffset;
    while (offset + 7 <= blockEnd) {
      const length = buffer.readUInt16LE(offset + 4);
      const type = buffer[offset + 6];
      offset += 7;
      if (!length && !type) break;
      if (offset + length > blockEnd) break;
      const fragment = buffer.subarray(offset, offset + length);
      offset += length;

      if (type === 1) {
        records.push({ index: index++, data: fragment });
        fragments = [];
      } else if (type === 2) {
        fragments = [fragment];
      } else if (type === 3 && fragments.length) {
        fragments.push(fragment);
      } else if (type === 4 && fragments.length) {
        fragments.push(fragment);
        records.push({ index: index++, data: Buffer.concat(fragments) });
        fragments = [];
      }
    }
    blockOffset += 32768;
  }

  return records;
}

function readTableBlocks(buffer) {
  const blocks = [];
  const footerOffset = buffer.length - 48;
  if (footerOffset < 0) return blocks;

  const footer = buffer.subarray(footerOffset);
  const indexHandle = readSecondBlockHandle(footer);
  if (!indexHandle) return blocks;

  const indexBlock = readBlock(buffer, indexHandle.offset, indexHandle.size);
  if (!indexBlock) return blocks;
  blocks.push({ kind: "sst-index", data: indexBlock });

  for (const handle of parseIndexBlockHandles(indexBlock)) {
    const data = readBlock(buffer, handle.offset, handle.size);
    if (data) blocks.push({ kind: `sst-data-${handle.offset}`, data });
  }

  return blocks;
}

function readSecondBlockHandle(footer) {
  const first = readBlockHandleAt(footer, 0);
  if (!first) return null;
  return readBlockHandleAt(footer, first.nextOffset);
}

function readBlockHandleAt(buffer, start) {
  const offset = readVarint64(buffer, start);
  if (!offset) return null;
  const size = readVarint64(buffer, offset.nextOffset);
  if (!size) return null;
  return {
    offset: Number(offset.value),
    size: Number(size.value),
    nextOffset: size.nextOffset
  };
}

function readVarint64(buffer, start) {
  let result = 0n;
  let shift = 0n;
  for (let i = start; i < Math.min(buffer.length, start + 10); i += 1) {
    const byte = buffer[i];
    result |= BigInt(byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) return { value: result, nextOffset: i + 1 };
    shift += 7n;
  }
  return null;
}

function readBlock(buffer, offset, size) {
  if (offset < 0 || size < 0 || offset + size + 5 > buffer.length) return null;
  const raw = buffer.subarray(offset, offset + size);
  const compression = buffer[offset + size];
  if (compression === 0) return raw;
  if (compression === 1) {
    try {
      return decodeSnappyBlock(raw);
    } catch {
      return null;
    }
  }
  return null;
}

function parseIndexBlockHandles(block) {
  const restartCount = block.readUInt32LE(block.length - 4);
  const restartOffset = block.length - 4 - restartCount * 4;
  if (restartOffset < 0 || restartOffset > block.length) return [];

  const handles = [];
  let offset = 0;
  let key = Buffer.alloc(0);

  while (offset < restartOffset) {
    const shared = readVarint32(block, offset);
    if (!shared) break;
    const nonShared = readVarint32(block, shared.nextOffset);
    if (!nonShared) break;
    const valueLength = readVarint32(block, nonShared.nextOffset);
    if (!valueLength) break;
    offset = valueLength.nextOffset;
    if (offset + nonShared.value + valueLength.value > restartOffset) break;

    key = Buffer.concat([
      key.subarray(0, shared.value),
      block.subarray(offset, offset + nonShared.value)
    ]);
    offset += nonShared.value;

    const value = block.subarray(offset, offset + valueLength.value);
    offset += valueLength.value;

    const handle = readBlockHandleAt(value, 0);
    if (handle) handles.push({ offset: handle.offset, size: handle.size });
  }

  return handles;
}

function readVarint32(buffer, start) {
  let result = 0;
  let shift = 0;
  for (let i = start; i < Math.min(buffer.length, start + 5); i += 1) {
    const byte = buffer[i];
    result |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) return { value: result, nextOffset: i + 1 };
    shift += 7;
  }
  return null;
}

function decodeSnappyBlock(input) {
  let offset = 0;
  const lengthResult = readSnappyVarint(input, offset);
  const output = Buffer.alloc(lengthResult.value);
  offset = lengthResult.nextOffset;
  let out = 0;

  while (offset < input.length) {
    const tag = input[offset++];
    const type = tag & 0x03;

    if (type === 0) {
      let literalLength = tag >> 2;
      if (literalLength < 60) {
        literalLength += 1;
      } else {
        const bytes = literalLength - 59;
        literalLength = 1;
        let length = 0;
        for (let i = 0; i < bytes; i += 1) {
          length |= input[offset++] << (8 * i);
        }
        literalLength += length;
      }
      input.copy(output, out, offset, offset + literalLength);
      offset += literalLength;
      out += literalLength;
      continue;
    }

    let copyLength;
    let copyOffset;
    if (type === 1) {
      copyLength = ((tag >> 2) & 0x7) + 4;
      copyOffset = ((tag & 0xe0) << 3) | input[offset++];
    } else if (type === 2) {
      copyLength = (tag >> 2) + 1;
      copyOffset = input[offset] | (input[offset + 1] << 8);
      offset += 2;
    } else {
      copyLength = (tag >> 2) + 1;
      copyOffset = input[offset] | (input[offset + 1] << 8) | (input[offset + 2] << 16) | (input[offset + 3] << 24);
      offset += 4;
    }

    for (let i = 0; i < copyLength; i += 1) {
      output[out] = output[out - copyOffset];
      out += 1;
    }
  }

  return output.subarray(0, out);
}

function readSnappyVarint(buffer, start) {
  let result = 0;
  let shift = 0;
  for (let i = start; i < Math.min(buffer.length, start + 5); i += 1) {
    const byte = buffer[i];
    result |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) return { value: result, nextOffset: i + 1 };
    shift += 7;
  }
  throw new Error("Invalid Snappy varint");
}
