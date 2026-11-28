/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/witness.json`.
 */
export type Witness = {
  "address": "2CyjSQFX9pSJV7uTVG8UwvGxeDuRQyWZrfHMd8FZeeYJ",
  "metadata": {
    "name": "witness",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Witness: writes a file's hash to the chain exactly once"
  },
  "instructions": [
    {
      "name": "registerRecording",
      "discriminator": [
        134,
        1,
        57,
        133,
        241,
        98,
        215,
        15
      ],
      "accounts": [
        {
          "name": "recording",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  99
                ]
              },
              {
                "kind": "arg",
                "path": "audioHash"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "audioHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "recordedAt",
          "type": "i64"
        },
        {
          "name": "durationMs",
          "type": "u32"
        },
        {
          "name": "locationCommitment",
          "type": {
            "option": {
              "array": [
                "u8",
                32
              ]
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "recording",
      "discriminator": [
        127,
        40,
        57,
        149,
        55,
        75,
        215,
        111
      ]
    }
  ],
  "events": [
    {
      "name": "recordingRegistered",
      "discriminator": [
        33,
        181,
        75,
        66,
        74,
        153,
        189,
        180
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidDuration",
      "msg": "duration_ms 0 olamaz"
    }
  ],
  "types": [
    {
      "name": "recording",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "audioHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "recordedAt",
            "type": "i64"
          },
          {
            "name": "anchoredAt",
            "type": "i64"
          },
          {
            "name": "durationMs",
            "type": "u32"
          },
          {
            "name": "locationCommitment",
            "type": {
              "option": {
                "array": [
                  "u8",
                  32
                ]
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "recordingRegistered",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "audioHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "anchoredAt",
            "type": "i64"
          },
          {
            "name": "durationMs",
            "type": "u32"
          }
        ]
      }
    }
  ]
};
