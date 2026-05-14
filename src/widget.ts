async function main() {
  const widget = new ListWidget();
  widget.addText("Hello World");
  Script.setWidget(widget);

  if (config.runsInWidget) {
    Script.complete();
  } else {
    const a = new Alert();
    a.title = "Hello World";
    a.message = "main() ran successfully";
    a.addAction("OK");
    await a.presentAlert();
    await widget.presentSmall();
  }
}

module.exports = { main };
