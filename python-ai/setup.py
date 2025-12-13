from setuptools import setup, find_packages

setup(
    name="python_ai",
    version="0.1.0",
    packages=find_packages("src"),
    package_dir={"": "src"},
    install_requires=[
        "fastapi",
        "pydantic",
        "torch",
        "transformers",
        "huggingface_hub",
    ],
    extras_require={
        "dev": [
            "pytest",
            "pytest-asyncio",
        ],
    },
    python_requires=">=3.10",
)
