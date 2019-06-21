# Sensibo Sky Homebridge plugin

I primarily wrote this for myself so it's not very robust. It currently only supports one device.

## Usage

1. Go to [https://home.sensibo.com/me/api](https://home.sensibo.com/me/api)
2. Login and add an API key (I called mine `Homebridge`)
3. Find your device ID by running the following in your terminal. Make sure to use your API key by replacing `your-api-key-here` with the key you generated in the previous step.

```
curl -s "https://home.sensibo.com/api/v2/users/me/pods?fields=id&apiKey=your-api-key-here" | node -pe "JSON.parse(require('fs').readFileSync('/dev/stdin').toString()).result[0].id"
```

4. Update your Homebridge config with you API key and device ID:

```
{
  "bridge": {
    "name": "Homebridge",
    "username": "CC:22:3D:E3:CE:30",
    "port": 51826,
    "pin": "031-45-154"
  },
  "description": "Stef's homebridge config",
  "accessories": [
    {
      "accessory": "Sensibo",
      "name": "Sensibo",
      "apiKey": "your-api-key",
      "deviceID": "your-device-id"
    }
  ],
  "platforms": []
}
```
