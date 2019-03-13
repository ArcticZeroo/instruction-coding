enum Command {
    and, eor, sub, rsb, add, adc, sbc, rsc, tst, teo, cmp, cmn, orr, lsl, lsr, asr, rrx, ror, bic, mov, mvn
}

enum Condition {
    eq, ne, cs, hs, cc, lo, mi, pl, vs, vc, hi, ls, ge, lt, gt, le, al
}

const commandData = {
    [Command.and]: '0000',
    [Command.eor]: '0001',
    [Command.sub]: '0010',
    [Command.rsb]: '0011',
    [Command.add]: '0100',
    [Command.adc]: '0101',
    [Command.sbc]: '0110',
    [Command.rsc]: '0111',
    [Command.tst]: '1000',
    [Command.teo]: '1001',
    [Command.cmp]: '1010',
    [Command.cmn]: '1011',
    [Command.mov]: '1101',
    [Command.lsl]: '1101',
    [Command.lsr]: '1101',
    [Command.asr]: '1101',
    [Command.rrx]: '1101',
    [Command.ror]: '1101',
    [Command.bic]: "1110",
    [Command.mvn]: '1111'
};

const conditionData = {
    [Condition.eq]: '0000',
    [Condition.ne]: '0001',
    [Condition.cs]: '0010',
    [Condition.hs]: '0010',
    [Condition.cc]: '0011',
    [Condition.lo]: '0011',
    [Condition.mi]: '0100',
    [Condition.pl]: '0101',
    [Condition.vs]: '0110',
    [Condition.vc]: '0111',
    [Condition.hi]: '1000',
    [Condition.ls]: '1001',
    [Condition.ge]: '1010',
    [Condition.lt]: '1011',
    [Condition.gt]: '1100',
    [Condition.le]: '1101',
    [Condition.al]: '1110'
};

type DataTransformer = (instruction: IDataProcessingInstruction) => void;

const transformSetsFlags: DataTransformer = function (instruction: IDataProcessingInstruction) {
    instruction.isSettingFlags = true;
};

const commandTransforms = {
    [Command.tst]: transformSetsFlags,
    [Command.teo]: transformSetsFlags,
    [Command.cmp]: transformSetsFlags,
    [Command.cmn]: transformSetsFlags,
    [Command.lsl](instruction: IDataProcessingInstruction) {
        instruction.manualShSet = '00';
        instruction.isImmediate = false;
    },
    [Command.add](instruction: IDataProcessingInstruction) {
        if (instruction.isImmediate && instruction.immediateValue < 0) {
            instruction.command = Command.sub;
            instruction.immediateValue = Math.abs(instruction.immediateValue);
        }
    }
};

const negativeComplements = {
    [Command.mov]: Command.mvn,
    [Command.mvn]: Command.mov,
    [Command.and]: Command.bic,
    [Command.bic]: Command.and
};

interface IDataProcessingInstruction {
    command: Command;
    condition: Condition;
    isSettingFlags: boolean;
    isImmediate: boolean;
    isShiftedRegister: boolean;
    destinationRegister: number;
    registerToShift?: number;
    shiftAmount?: number;
    intermediateRegister?: number;
    sourceRegister?: number;
    immediateValue?: number;
    rotationAmount?: number;
    manualShamt5Set?: string;
    manualShSet?: string;
}

function boolToBinary(b: boolean): string {
    return b ? '1' : '0';
}

function numToBinary(n: number, length: number = 4): string {
    // @ts-ignore
    return n.toString(2).padStart(length, '0');
}

function codeDataProcessingInstruction(instruction: IDataProcessingInstruction): string {
    instruction = Object.assign({
        isImmediate: false,
        isSettingFlags: false,
        isShiftedRegister: false,
        condition: Condition.al,
    }, instruction);

    if (instruction.command == null) {
        throw new Error('Command is missing');
    }

    if (instruction.isImmediate && instruction.immediateValue < 0) {
        if (negativeComplements[instruction.command]) {
            instruction.command = negativeComplements[instruction.command];
            instruction.immediateValue = ~instruction.immediateValue;
        }
    }

    if (!conditionData.hasOwnProperty(instruction.condition)) {
        throw new Error('Unknown condition');
    }

    if (!commandData.hasOwnProperty(instruction.command)) {
        throw new Error('Unknown command');
    }

    if (commandTransforms.hasOwnProperty(instruction.command)) {
        commandTransforms[instruction.command](instruction);
    }

    const pieces = [
        conditionData[instruction.condition],
        '00', // 00 /shrug
        boolToBinary(instruction.isImmediate),
        commandData[instruction.command],
        boolToBinary(instruction.isSettingFlags),
        numToBinary(instruction.intermediateRegister || 0), // Rn
        numToBinary(instruction.destinationRegister)
    ];

    if (instruction.isImmediate) {
        pieces.push(
            '0000',
            numToBinary(instruction.immediateValue, 8)
        );
    } else if (!instruction.isShiftedRegister) {
        pieces.push(
            instruction.manualShamt5Set || '00000', // shamt5,
            instruction.manualShSet || '00', // sh,
            '0', // 0 /shrug
            numToBinary(instruction.sourceRegister)
        );
    } else {
        // not yet implemented
        throw new Error('Shifted register is not implemented');
    }


    return pieces.join('');
}