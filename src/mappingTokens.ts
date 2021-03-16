import { Transfer } from "../generated/Tokens/Tokens";
import { Artifact } from "../generated/schema";

export function handleTransfer(event: Transfer): void {
    let artifactId = hexStringToPaddedUnprefixed(event.params.tokenId.toHexString());
    let artifact = Artifact.load(artifactId);
    // Let core new up artifact.
    // Only becomes yours when withdrawn, which is a transfer handled here
    if (artifact !== null) {
        artifact.owner = event.params.to.toHexString();
        artifact.save();
    }
}

// BigInt does not get 0 padded by toHexString plus gets a 0x prefix...
function hexStringToPaddedUnprefixed(prefixed: String): String {
    // strip 0x
    let stripped = prefixed.substring(2, prefixed.length);
    // pad to 64
    let padded = stripped.padStart(64, "0")
    return padded;
}
