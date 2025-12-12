import torch

def get_device():
    # NVIDIA CUDA
    if torch.cuda.is_available():
        return torch.device("cuda")

    # Apple Silicon MPS
    if torch.backends.mps.is_available():
        return torch.device("mps")

    # CPU fallback
    return torch.device("cpu")
