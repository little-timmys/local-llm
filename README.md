# Local LLM setup

This workspace uses the [Ollama for VS Code](https://marketplace.visualstudio.com/items?itemName=Ollama.ollama) model provider to make locally served Ollama models available in VS Code Chat.

## Requirements

- Visual Studio Code 1.127 or newer
- [Ollama](https://ollama.com/download) installed and running
- At least one model downloaded in Ollama

## Get started

1. Install the recommended **Ollama** extension when VS Code prompts you, or install it from the Marketplace link above.
2. In a terminal, download a model that fits your machine. For example:

   ```sh
   ollama pull qwen3.6
   ```

   You can use any model available to Ollama; model size and hardware requirements vary.
3. Open VS Code Chat and select a model from the **Ollama** section in the model picker.

The extension discovers models from `http://127.0.0.1:11434` by default. Local models do not require an API key or account sign-in. If a newly downloaded model does not appear, use **Ollama: Refresh Models** from the Command Palette.
