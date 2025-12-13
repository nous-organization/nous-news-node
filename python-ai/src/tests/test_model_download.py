import os
from transformers import AutoTokenizer, AutoModelForSequenceClassification

def test_model_download():
    # Model identifier
    hf_id = "distilbert/distilbert-base-uncased-finetuned-sst-2-english"
    
    try:
        # Attempt to download and save the model
        print("Downloading tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained(hf_id)
        print("Downloading model...")
        model = AutoModelForSequenceClassification.from_pretrained(hf_id)

        # Specify a local directory to save the model
        local_model_path = './local_model'

        # Ensure the directory exists
        os.makedirs(local_model_path, exist_ok=True)

        # Save the model and tokenizer locally
        model.save_pretrained(local_model_path)
        tokenizer.save_pretrained(local_model_path)

        print(f"Model and tokenizer successfully saved to {local_model_path}")

    except Exception as e:
        print(f"Error during download or saving: {e}")


if __name__ == "__main__":
    test_model_download()
