;;; my-telega.el --- Local Telegram client setup -*- lexical-binding: t; -*-

(use-package telega
  :ensure t
  :commands (telega)
  :bind (("C-c T" . telega))
  :init
  ;; TDLib's account database and downloaded media stay out of the repo.
  (setq telega-directory
        (expand-file-name "telega/" (or (getenv "XDG_DATA_HOME") "~/.local/share/"))
        telega-server-libs-prefix (expand-file-name "~/.local/opt/tdlib-1.8.66")
        telega-server-command (expand-file-name "telega-server" telega-directory))
  (make-directory telega-directory t)
  (set-file-modes telega-directory #o700))

(provide 'my-telega)
