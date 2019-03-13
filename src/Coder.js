var Command;
(function (Command) {
    Command[Command["and"] = 0] = "and";
    Command[Command["eor"] = 1] = "eor";
    Command[Command["sub"] = 2] = "sub";
    Command[Command["rsb"] = 3] = "rsb";
    Command[Command["add"] = 4] = "add";
    Command[Command["adc"] = 5] = "adc";
    Command[Command["sbc"] = 6] = "sbc";
    Command[Command["rsc"] = 7] = "rsc";
    Command[Command["tst"] = 8] = "tst";
    Command[Command["teo"] = 9] = "teo";
    Command[Command["cmp"] = 10] = "cmp";
    Command[Command["cmn"] = 11] = "cmn";
    Command[Command["orr"] = 12] = "orr";
    Command[Command["lsl"] = 13] = "lsl";
    Command[Command["lsr"] = 14] = "lsr";
    Command[Command["asr"] = 15] = "asr";
    Command[Command["rrx"] = 16] = "rrx";
    Command[Command["ror"] = 17] = "ror";
    Command[Command["bic"] = 18] = "bic";
    Command[Command["mov"] = 19] = "mov";
    Command[Command["mvn"] = 20] = "mvn";
})(Command || (Command = {}));
var Condition;
(function (Condition) {
    Condition[Condition["eq"] = 0] = "eq";
    Condition[Condition["ne"] = 1] = "ne";
    Condition[Condition["cs"] = 2] = "cs";
    Condition[Condition["hs"] = 3] = "hs";
    Condition[Condition["cc"] = 4] = "cc";
    Condition[Condition["lo"] = 5] = "lo";
    Condition[Condition["mi"] = 6] = "mi";
    Condition[Condition["pl"] = 7] = "pl";
    Condition[Condition["vs"] = 8] = "vs";
    Condition[Condition["vc"] = 9] = "vc";
    Condition[Condition["hi"] = 10] = "hi";
    Condition[Condition["ls"] = 11] = "ls";
    Condition[Condition["ge"] = 12] = "ge";
    Condition[Condition["lt"] = 13] = "lt";
    Condition[Condition["gt"] = 14] = "gt";
    Condition[Condition["le"] = 15] = "le";
    Condition[Condition["al"] = 16] = "al";
})(Condition || (Condition = {}));
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
const transformSetsFlags = function (instruction) {
    instruction.isSettingFlags = true;
};
const commandTransforms = {
    [Command.tst]: transformSetsFlags,
    [Command.teo]: transformSetsFlags,
    [Command.cmp]: transformSetsFlags,
    [Command.cmn]: transformSetsFlags,
    [Command.lsl](instruction) {
        instruction.manualShSet = '00';
        instruction.isImmediate = false;
    },
    [Command.add](instruction) {
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
function boolToBinary(b) {
    return b ? '1' : '0';
}
function numToBinary(n, length = 4) {
    // @ts-ignore
    return n.toString(2).padStart(length, '0');
}
function codeDataProcessingInstruction(instruction) {
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
        '00',
        boolToBinary(instruction.isImmediate),
        commandData[instruction.command],
        boolToBinary(instruction.isSettingFlags),
        numToBinary(instruction.intermediateRegister || 0),
        numToBinary(instruction.destinationRegister)
    ];
    if (instruction.isImmediate) {
        pieces.push('0000', numToBinary(instruction.immediateValue, 8));
    }
    else if (!instruction.isShiftedRegister) {
        pieces.push(instruction.manualShamt5Set || '00000', // shamt5,
        instruction.manualShSet || '00', // sh,
        '0', // 0 /shrug
        numToBinary(instruction.sourceRegister));
    }
    else {
        // not yet implemented
        throw new Error('Shifted register is not implemented');
    }
    return pieces.join('');
}
