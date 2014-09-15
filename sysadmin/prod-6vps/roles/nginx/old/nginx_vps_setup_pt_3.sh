#!/bin/bash

# Set up tripwire
sudo apt-get install tripwire
#[this will prompt configurations.
#to configure email notifications, select “internet site”
#select Yes until asked to choose passphrases, then choose strong passphrases]
sudo tripwire --init
sudo sh -c 'tripwire --check | grep Filename > test_results' # this creates a file containing the files that are tripping up tripwire
less /etc/tripwire/test_results # this actually lists what those files are
sudo nano /etc/tripwire/twpol.txt
#[comment out all the lines that match the files listed in test_results]
#[comment out the line /etc/rc.boot in the Boot Scripts section, since this isn’t present in Ubuntu]
#[comment out the /proc line, and add lines for all of:
#        /proc/devices           -> $(Device) ;
#         /proc/net               -> $(Device) ;
#         /proc/tty               -> $(Device) ;
#         /proc/sys               -> $(Device) ;
#         /proc/cpuinfo           -> $(Device) ;
#         /proc/modules           -> $(Device) ;
#         /proc/mounts            -> $(Device) ;
#         /proc/dma               -> $(Device) ;
#         /proc/filesystems       -> $(Device) ;
#         /proc/interrupts        -> $(Device) ;
#         /proc/ioports           -> $(Device) ;
#         /proc/scsi              -> $(Device) ;
#         /proc/kcore             -> $(Device) ;
#         /proc/self              -> $(Device) ;
#         /proc/kmsg              -> $(Device) ;
#         /proc/stat              -> $(Device) ;
#         /proc/loadavg           -> $(Device) ;
#         /proc/uptime            -> $(Device) ;
#         /proc/locks             -> $(Device) ;
#         /proc/meminfo           -> $(Device) ;
#         /proc/misc              -> $(Device) ;
# ]
#[add a line below the /dev line for /dev/pts:
#/dev/pts                -> $(Device) ;
#]
#[comment out the /var/lock and /var/run lines]
sudo twadmin -m P /etc/tripwire/twpol.txt # this recreates the encrypted policy file
sudo tripwire --init
#[all warnings received earlier should now be gone. if not, keep editing until they’re gone]
sudo tripwire --check # should return no errors or changes found, if we are truly ready to go
sudo rm /etc/tripwire/test_results
# remove plain text config files, since we can recreate these from encrypted versions using passphrase
sudo sh -c 'twadmin --print-polfile > /etc/tripwire/twpol.txt'
sudo mv /etc/tripwire/twpol.txt /etc/tripwire/twpol.txt.bak
sudo sh -c 'twadmin --print-polfile > /etc/tripwire/twpol.txt' # if command successful, can remove the text files
sudo rm /etc/tripwire/twpol.txt
sudo rm /etc/tripwire/twpol.txt.bak
# configure email notifications
sudo apt-get install mailutils
sudo tripwire --check | mail -s "Tripwire report for `uname -n`" ian@wynno.com
# okay the software change (i.e. the installation of mailutils)
sudo tripwire --check --interactive
#[save and close the file which has opened, removing any x’s for file changes we were not okay with]
# now automate the execution of tripwire using a cron job
sudo crontab -l
# if a crontab is present, back it up:
sudo sh -c 'crontab -l > crontab.bad'
# in any case, edit the crontab as follows
sudo crontab -e
#[add this line to the crontab:
#30 3 * * * /usr/sbin/tripwire --check | mail -s "Tripwire report for `uname -n`" your_email@domain.com
#]
#[save and close]

# Set the fully qualified domain name?
# TODO

service nginx restart

exit
