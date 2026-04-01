import httpx
import asyncio

async def test():
    api_key = "84f13eb2c44b1cb903f3327b7a52970903bf5d3e3b5888ab3816c92dcd8f20e7"
    
    tts_url = "https://api.elevenlabs.io/v1/text-to-speech/JBFqnCBsd6RMkjVDRZzb"
    tts_res = httpx.post(
        tts_url,
        headers={"xi-api-key": api_key},
        json={"text": "Hello, this is a test. Can you hear me?"}
    )
    tts_res.raise_for_status()
    audio = tts_res.content
    print("Generated test audio of size:", len(audio))
    
    stt_url = "https://api.elevenlabs.io/v1/speech-to-text"
    try:
        res = httpx.post(
            stt_url,
            headers={"xi-api-key": api_key},
            data={"model_id": "scribe_v2"},
            files={"file": ("test.mp3", audio, "audio/mpeg")}
        )
        print("STATUS:", res.status_code)
        try:
            print("JSON:", res.json())
        except:
            print("TEXT:", res.text)
    except Exception as e:
        print("EXCEPTION:", repr(e))

asyncio.run(test())
