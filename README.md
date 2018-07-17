This is an experimental, B2G-independent reimplementation of Graphene on Gecko.

```bash
git clone https://github.com/mykmelez/graphene-gecko.git
cd graphene-gecko

# If you don't already have the Mozilla build toolchain:
./python/mozboot/bin/bootstrap.py --no-interactive --application-choice=browser

./mach build
./mach run https://mykmelez.github.io/browserhtml/
```

Note that the following pref must be set for Browser API.

```
user_pref("dom.mozBrowserFramesEnabledForContent", true);
```

