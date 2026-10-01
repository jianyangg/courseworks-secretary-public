from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from courseworks_secretary.token_setup import configure_token


class TokenSetupTests(unittest.TestCase):
    def test_saves_token_and_preserves_other_settings(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / '.env'
            path.write_text('SESSION_SECRET=existing\nCOURSEWORKS_API_TOKEN=old\n')
            with patch('courseworks_secretary.token_setup.getpass.getpass', return_value=' new-token '):
                configure_token(path)
            self.assertIn('SESSION_SECRET=existing', path.read_text())
            self.assertIn('COURSEWORKS_API_TOKEN=new-token', path.read_text())
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)

    def test_empty_entry_does_not_change_existing_file(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / '.env'
            path.write_text('COURSEWORKS_API_TOKEN=existing\n')
            with patch('courseworks_secretary.token_setup.getpass.getpass', return_value=''):
                with self.assertRaises(ValueError):
                    configure_token(path)
            self.assertEqual(path.read_text(), 'COURSEWORKS_API_TOKEN=existing\n')
