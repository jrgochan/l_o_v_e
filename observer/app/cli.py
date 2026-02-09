"""Observer CLI Entrypoint."""

import logging

import typer

from app.commands import matrix, seed, verify

app = typer.Typer(name="observer", help="L.O.V.E. Observer CLI")

app.add_typer(seed.app, name="seed")
app.add_typer(matrix.app, name="matrix")
app.add_typer(verify.app, name="verify")


@app.callback()
def main(
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Enable verbose logging"),
) -> None:
    """L.O.V.E. Observer Command Line Interface."""
    log_level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(level=log_level, format="%(message)s")


if __name__ == "__main__":
    app()
