"""Bridge must not expose App authorization or accept arbitrary sites/endpoints."""
import importlib.util
import pathlib
import tempfile
import unittest

FILE = pathlib.Path(__file__).resolve().parents[1] / 'root/home/.config/qutebrowser/bilibili-api.py'
spec = importlib.util.spec_from_file_location('bili_api', FILE)
api = importlib.util.module_from_spec(spec)
spec.loader.exec_module(api)

class BiliTests(unittest.TestCase):
    def test_sign(self):
        import hashlib
        from urllib.parse import urlencode
        p = api.signed({'z':'a b', 'a':'中文'})
        self.assertEqual(p['sign'], hashlib.md5((urlencode(sorted((k,v) for k,v in p.items() if k!='sign')) + api.APPSEC).encode()).hexdigest())

    def test_local_auth_and_endpoint_limits(self):
        with tempfile.TemporaryDirectory() as d:
            path = pathlib.Path(d)/'auth.json'
            client = api.Client(path)
            self.assertEqual(client.call('status', {}), {'logged_in':False})
            with self.assertRaises(ValueError): client.call('https://example.com', {})
            with self.assertRaises(ValueError): client.call('feed', {})
            client.save_auth({'access_token':'TEST_ONLY', 'expires_in':3600})
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)
            self.assertNotIn('TEST_ONLY', str(client.call('status', {})))
            self.assertTrue(api.Client(path).call('status', {})['logged_in'])

    def test_bridge_origin_and_key(self):
        from urllib.request import Request, urlopen
        from urllib.error import HTTPError
        import json
        with tempfile.TemporaryDirectory() as d:
            server, connection = api.start(pathlib.Path(d)/'auth.json')
            try:
                for origin, key in [('https://example.com', connection['key']), (api.ORIGIN, 'wrong')]:
                    req = Request(connection['url']+'/status', data=b'{}', headers={'Origin':origin, 'X-Qute-Bili':key})
                    with self.assertRaises(HTTPError) as err: urlopen(req)
                    self.assertEqual(err.exception.code, 403)
                    err.exception.close()
                req = Request(connection['url']+'/status', data=b'{}', headers={'Origin':api.ORIGIN, 'X-Qute-Bili':connection['key']})
                with urlopen(req) as res:
                    self.assertEqual(json.load(res), {'data':{'logged_in':False}})
            finally:
                server.shutdown()
                server.server_close()

if __name__ == '__main__': unittest.main()
