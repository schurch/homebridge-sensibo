# Sensibo Sky Homebridge plugin

I primarily wrote this for myself so it's not very robust.

## Usage

1. Go to [https://home.sensibo.com/me/api](https://home.sensibo.com/me/api)
2. Login and add an API key (I called mine `Homebridge`)
3. Update your Homebridge config with you API key:

```

{
  "bridge": {
    "name": "Homebridge",
    "username": "CC:22:3D:E3:CE:43",
    "port": 51826,
    "pin": "031-45-123"
  },
  "description": "Stef's homebridge config",
  "accessories": [],
  "platforms": [
    {
      "platform": "Sensibo",
      "name": "Sensibo",
      "apiKey": "your-api-key-here"
    }
  ]
}

```
