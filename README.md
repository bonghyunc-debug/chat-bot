<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1MlZ6i7tNjctdeWAdX4pojD4u2FfTFnXe

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` (or `VITE_GEMINI_API_KEY`) in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Testing

로컬 환경에서 주요 리소스가 올바르게 빌드되는지 확인하려면 다음 명령을 실행하세요:

```
npm run build
```

자세한 테스트 체크리스트와 실행 여부는 [TESTING.md](TESTING.md)에서 확인할 수 있습니다.

## Playground parity helpers

- The **Playground Inspector** (below the header) shows the exact payload, tools, and token usage used for the latest request, so you can validate settings before exporting code.
