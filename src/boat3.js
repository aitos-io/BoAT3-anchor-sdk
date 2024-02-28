

const Ethers = require('ethers');
const JsonRpcClient = require('./rpc.client');


const DEFAULT_TEMPLATE = "default";

function parseAuthorization(authorization) {
	var json = Ethers.toUtf8String(Ethers.decodeBase64(authorization));
	var config = JSON.parse(json);
	return config;
}

function rlpDataBaseTemplate(data, template) {
	var dataArray = [];

	for (var i = 0; i < template.fields.length; i++) {
		var field = template.fields[i];
		var type = field.type;
		var value = data[field.name];
		var encodeValue = null;

		if (type === 'number') {
			encodeValue = Ethers.toUtf8Bytes(value + '');
		} else if (type === 'boolean') {
			encodeValue = Ethers.hexlify(Ethers.toBeArray(Number(value)));
		} else if (type === 'string') {
			encodeValue = Ethers.toUtf8Bytes(value);
		} else if (type === 'hexstring') {
			encodeValue = value;
    } else if (type === 'timestamp') {
      encodeValue = Ethers.hexlify(Ethers.toBeArray(value));
		} else {
			throw new Error(`Unsupport field type: ${type} when RLP encode data(${JSON.stringify(data)}) with template(${JSON.stringify(template)})`);
		}

		dataArray.push(encodeValue);
	}

	// console.log(dataArray);
	return Ethers.encodeRlp(dataArray);
}

async function signMessage(privateKey, message) {
  const wallet = new Ethers.Wallet(privateKey);
  const signature = await wallet.signingKey.sign(message);
  const signHex = signature.r + signature.s.replace('0x', '') + signature.v.toString(16);
  return signHex;
}

async function packMessage(data, proof, device) {
	const rlpData = rlpDataBaseTemplate({ data: JSON.stringify(data) }, {
		fields: [
			{ "name": "data","type": "string" },
		]
	});

	const dataHash = Ethers.keccak256(rlpData);
	proof.dataHash = dataHash;

	var proofTemplate = {
		fields: [
			{ "name": "connectorId","type": "string" },
			{ "name": "templateId","type": "string" },
			{ "name": "deviceId","type": "hexstring" },
			{ "name": "algorithmSuite","type": "string" },
			{ "name": "timestamp","type": "timestamp" },
			{ "name": "dataHash","type": "hexstring" },
		]
	}

	const proofDtoEncodeHex = rlpDataBaseTemplate(proof, proofTemplate);
	const proofDtoEncodeHash = Ethers.keccak256(proofDtoEncodeHex);
	const signHex = await signMessage(device.privateKey, proofDtoEncodeHash);
	proof.signature = signHex;

	proofTemplate.fields.push({ 
		"name": "signature","type": "hexstring" 
	});

	const proofSignatureEncode = rlpDataBaseTemplate(proof, proofTemplate);

	const report = {
		data: rlpData,
		proof: proofSignatureEncode,
	};

	return report;
}


async function pack(businessData, authorization) {
	var data = businessData;

	var config = parseAuthorization(authorization);
	var connectorId = config.connector.connectorId;
	var templateId = DEFAULT_TEMPLATE;
	var device = config.device;
	var deviceId = device.deviceId;
	var algorithmSuite = "0000";
	var timestamp = Math.floor(Date.now() / 1000);

	//create a proof object as the proof of physical work
	var proof = {
		connectorId, templateId, deviceId, 
		algorithmSuite, timestamp,
	};

	//prepare the reporting message
	var message = await packMessage(data, proof, device);
	return message;
}

//send the message to connector on BoAT3 oracle
async function send(message, authorization) {
	var config = parseAuthorization(authorization);
  const result = await JsonRpcClient.sendMessage(message, config);
  return result;
}


module.exports = {
	pack, send,
}