#!/bin/sh
set -eu

# Only a public origin and optional URL path belong here, never OSS credentials.
# The strict ASCII URL alphabet also makes the JSON string safe as JavaScript.
config=$(awk 'BEGIN {
    mode = ENVIRON["GAME_ART_MODE"]; if (mode == "") mode = "auto";
    if (mode !~ /^(auto|local|direct|signed)$/) exit 1;
    value = ENVIRON["GAME_ASSET_BASE_URL"];
    if (mode == "signed" || mode == "auto") value = "";
    sub(/^[ \t\r\n]+/, "", value); sub(/[ \t\r\n]+$/, "", value);
    if (value != "") {
        if (value !~ /^[hH][tT][tT][pP][sS]?:\/\/[A-Za-z0-9.-]+(:[0-9]+)?(\/[A-Za-z0-9._~!$&()*+,;=:%@\/-]*)?$/) exit 1;
        authority = value; sub(/^[hH][tT][tT][pP][sS]?:\/\//, "", authority); sub(/\/.*/, "", authority);
        if (authority ~ /:/) {
            port = authority; sub(/^.*:/, "", port);
            if (port + 0 > 65535) exit 1;
        }
        sub(/\/+$/, "", value);
    }
    printf "globalThis.__GAME_RUNTIME_CONFIG__ = {\"artAssetBaseUrl\":\"%s\",\"artMode\":\"%s\",\"artUrlsEndpoint\":\"/api/art-urls\"};\n", value, mode;
}') || {
    echo 'Invalid GAME_ASSET_BASE_URL: expected an http(s) origin with optional ASCII/percent-encoded path, without credentials, query or fragment.' >&2
    exit 1
}
umask 022
printf '%s\n' "$config" > /tmp/game-runtime-config.js
