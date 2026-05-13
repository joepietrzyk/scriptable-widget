await (async () => {
  const widget = new ListWidget();
  widget.backgroundColor = new Color("#1a1a2e");

  const title = widget.addText("Hello, Scriptable!");
  title.font = Font.boldSystemFont(16);
  title.textColor = new Color("#e0e0e0");

  widget.addSpacer();

  const subtitle = widget.addText("Built with TypeScript + Bun");
  subtitle.font = Font.systemFont(12);
  subtitle.textColor = new Color("#a0a0c0");

  Script.setWidget(widget);

  if (config.runsInWidget) {
    Script.complete();
  } else {
    await widget.presentSmall();
  }
})();
