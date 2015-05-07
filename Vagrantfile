# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure('2') do |config|
  config.vm.provision "shell", inline: "echo Hello"

  config.vm.define :web do |web|
    web.vm.box = 'apache'
  end

  config.vm.define :db do |db|
    db.vm.box = 'postgres'
  end
end
