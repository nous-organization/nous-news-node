#!/usr/bin/env python
"""
Diagnostic script to debug the philosophical service.

Run with: python diagnose_philosophical.py
"""

import sys
import logging
from pathlib import Path

# Setup logging to see everything
logging.basicConfig(
    level=logging.DEBUG,
    format='[%(levelname)s] %(name)s: %(message)s'
)

logger = logging.getLogger(__name__)

# Add src to path
src_path = Path(__file__).parent / "src"
sys.path.insert(0, str(src_path))

logger.info("=" * 60)
logger.info("Starting Philosophical Service Diagnostic")
logger.info("=" * 60)

try:
    logger.info("Step 1: Importing philosophical service...")
    from ai.services import philosophical
    logger.info("✓ Successfully imported philosophical service")
    
    logger.info("\nStep 2: Checking service attributes...")
    logger.info(f"Module: {philosophical.__file__}")
    logger.info(f"Available functions: {[x for x in dir(philosophical) if not x.startswith('_')]}")
    
    logger.info("\nStep 3: Calling generate_philosophical_insight...")
    logger.info("This may take a while if loading Mistral-7B for first time...")
    
    result = philosophical.generate_philosophical_insight("What is truth?")
    
    logger.info("\n✓ Successfully got result!")
    logger.info(f"Result type: {type(result)}")
    logger.info(f"Result status: {result.status}")
    logger.info(f"Result data keys: {result.data.keys() if hasattr(result, 'data') else 'N/A'}")
    logger.info(f"Result: {result}")
    
    logger.info("\n" + "=" * 60)
    logger.info("✅ Diagnostic Complete - Service is working!")
    logger.info("=" * 60)
    
except ImportError as e:
    logger.error(f"\n❌ Import Error: {e}")
    logger.error("Make sure you're running from the project root directory")
    sys.exit(1)
    
except Exception as e:
    logger.error(f"\n❌ Error: {e}")
    logger.exception("Full traceback:")
    sys.exit(1)
    