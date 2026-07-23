#!/bin/sh

sudo sed -i \
    's|^GRUB_CMDLINE_LINUX_DEFAULT=.*|GRUB_CMDLINE_LINUX_DEFAULT="loglevel=4 gpiolib_acpi.run_edge_events_on_boot=0"|' \
    /etc/default/grub

sudo update-grub

