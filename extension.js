const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

function activate(context) {
  const disposable = vscode.commands.registerCommand("bricks.play", () => {
    const panel = vscode.window.createWebviewPanel(
      "bricksGame",
      "🎮 Bricks",
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    const gamePath = path.join(context.extensionPath, "bricks.js");
    const gameScript = fs.existsSync(gamePath)
      ? fs.readFileSync(gamePath, "utf8")
      : "console.error('Missing bricks.js');";

    // Theme-aware render
    const updateWebview = () => {
      const isDark = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark;
      const theme = isDark ? "dark" : "light";
      const background = isDark ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.6)";

      panel.webview.html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              html, body {
                margin: 0;
                padding: 0;
                overflow: hidden;
                background: ${background};
                font-family: Consolas, monospace;
              }
            </style>
          </head>
          <body>
            <script>
              const THEME = "${theme}";
            </script>
            <script>
              try {
                ${gameScript}
              } catch (err) {
                console.error('Game load error:', err);
              }
            </script>
          </body>
        </html>`;
    };

    updateWebview();

    // Watch for theme changes
    const themeListener = vscode.window.onDidChangeActiveColorTheme(updateWebview);
    panel.onDidDispose(() => themeListener.dispose());
  });

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = { activate, deactivate };