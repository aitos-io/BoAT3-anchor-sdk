


async function sendMessage(message, config) {
	var accountId = config.account.accountId;
	var connectId = config.connector.connectId;
	var token = config.connector.endpoints.accessToken;

	const baseUrl = 'https://dev.boat3.aitos.io';
	var url = `${baseUrl}/data-collection/iot/report/${accountId}/${connectId}`;

	var headers = {
		"Content-Type": "application/json",
		"Authorization": `Bearer ${token}`,
	};

  var response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(message)
  });

  if (response) {
    var json = await response.json();
    if (json.error) {
    	throw new Error(JSON.stringify(json.error));
    } else {
    	return json.result;
    }
  }

  throw new Error(`Error raised at url fetch = ${url}, body = ${JSON.stringify(message)}, headers = ${JSON.stringify(headers)}`);
}


module.exports = {
	sendMessage,
};