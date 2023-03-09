# Overview

Allium is a simple big-endian RISC-ish CPU architecture and hardware platform.

# Packages

- `arch`
    - Definitions and interfaces for the overall architecture.
    Should possibly be split up and merged into the `emulator` and `types` packages.
- `asm`
    - Source code assembler and compiler
- `emulator`
    - Platform emulator
- `io-bus`
    - Implementation of the Allium I/O architecture
- `types`
    - Common interfaces and utilities

# Usage

## Building

Build the repo by running the following command from the project root:
- [*nix] `sh build-all`
- [Windows] `type build-all | cmd`

## Simple example

This example demonstrates a basic program that calculates the volume of a 3x5x7 box

```javascript
const $Types = require('./types');
const $Asm = require('./asm');
const $Arch = require('./arch');
const $Emulator = require('./emulator');
const $IoBus = require('./io-bus');

const compiledAssembly = $Asm.AlmAssembler.compile([{
    referenceName: 'demo',
    fileContent:
        `Main:
            LOAD_ACCUMULATOR 3
            LOAD_MONDAY 5
            MULT [MONDAY]
            LOAD_MONDAY 7
            MULT [MONDAY]
            COPY [ACCUMULATOR] [TUESDAY]
            END`
}]);

// create a debug I/O controller with a 256-byte capacity
const ioController = new $Emulator.DebugIoController($Emulator.defaultFunctionScheduler, $Types.ByteSequenceCreator.DoubleByte(256));

// create an I/O bus
const ioBus = $IoBus.createIoBus();

// create a machine with 2048 bytes of memory
const computer = $Emulator.DebuggableComputer.create(
    $Types.ByteSequenceCreator.QuadByte(2048),
    ioController,
    ioBus);

// configure the machine to execute one instruction at a time
computer.setIterationInterval($Arch.IterationInterval.PipelineCycle);

// load the program
computer.loadProgram(compiledAssembly.programBytes);

// run the program to completion
while (!computer.isIdle()) {
    computer.iterate();
}

// get the final value
const volume = computer.readRegisterValue($Types.Register.Tuesday);

console.log('volume = ' + volume.toString({ radix: 10, padZeroes: false }));

```

## Development

Check out the [AlliumWorks](https://github.com/dclipp/alliumworks) project for a richer development experience, or visit the [hosted](https://allium.works/wide/) version.
