import { main as jsMain } from "protobufjs-cli/pbjs.js";
import { main as tsMain } from "protobufjs-cli/pbts.js";
import { writeFileSync } from "fs";

function writeFileHandleError(outputFile) {
    return (err, output) => {
        if (err) throw err;
        writeFileSync(outputFile, output);
    };
}

async function generateFromProtobuf(inputFile, jsFile, tsFile) {
    jsMain(["--target", "static-module", "--wrap", "es6", "--es6", "--force-long", "--no-create", "--no-verify", "--no-delimited", inputFile], writeFileHandleError(jsFile));
    tsMain([jsFile], writeFileHandleError(tsFile));
}

generateFromProtobuf("protos/main.proto", "src/protos.js", "src/protos.d.ts");
