# -*- mode: ruby -*-
# vi: set ft=ruby :

# Documentation copied from:
# http://docs.vagrantup.com/v2/docker/configuration.html

# Vagrant + Docker
# separate containers for:
#   * postgres/mysql
#   * node.js/io.js + sqlite
#   * key/value and/or document store
#   * queue service (beanstalkd, zeroMQ, etc) (or just use node)
#     * any of these queue services save their state?
#       * with node would have to save state in database
Vagrant.configure('2') do |config|

  config.vm.define :web do |web|
    web.vm.provider 'docker' do |d|
      d.image = 'nginx'
    end
    #web.vm.box = 'apache'
    #web.vm.provision 'shell', inline: 'echo Hello'
  end

  config.vm.define :db do |db|
    db.vm.provider 'docker' do |d|
      # The image to launch, specified by the image ID
      # or a name such as 'ubuntu:12.04'
      d.image = 'postgres'
    end
    #db.vm.box = 'postgres'
    #db.vm.provision 'shell', inline: 'echo Hello'
  end

  config.vm.define :app do |app|
    app.vm.provider 'docker' do |d|
      # Looks for a Dockerfile in the 'docker' directory
      # When vagrant up --provider=docker is run, Vagrant
      # automatically builds that Dockerfile and starts
      # a container based on that Dockerfile. The Dockerfile
      # is rebuilt when vagrant reload is called.
      d.build_dir = './docker'

      # Extra arguments to pass to 'docker build' when build_dir
      # is in use
      #d.build_args = ['arg1', 'arg2']

      # Custom command to run on the container
      #d.cmd = ['ls', '/app']

      # Additional args to pass to 'docker run' when the container
      # is started. Can be used to set parameters that aren't
      # exposed via the Vagrantfile
      #d.create_args = ['arg1', 'arg2']

      # Environment variables to expose into the container
      #d.env = {}

      # Ports to expose from the container but not to the host machine
      # Useful for links
      #d.expose = [80, 8080]

      # Link this container to another by name.
      # Note, if you're linking to another container in the same
      # Vagrantfile, make sure you call vagrant up with the
      # --no-parallel flag
      #d.link = (name:alias)

      # If true, then a host VM will be spun up even if the computer
      # running Vagrant supports Docker. Useful to enforce a
      # consistent environment to run Docker
      d.force_host_vm = false

      # If true, then Vagrant will support SSH with the container.
      # This allows 'vagrant ssh' to work, provisioners, etc.
      d.has_ssh = false # default: false

      # Synced folder options for the 'build_dir', since the build
      # directory is synced using a synced folder if a host VM is
      # in use
      #d.host_vm_build_dir_options = {}

      # Name of the container. Note that this has to be unique
      # across all containers on the host VM. By default Vagrant
      # will generate some random name.
      #d.name = 'app'

      # Ports to expose from the container to the host
      #d.ports = ['hostPort:containerPort', 'hostPort2:containerPort2']

      # If true, Vagrant expects this container to remain running and
      # will make sure that it does for a certain amout of time. If
      # false, then Vagrant expects that this container will
      # automatically stop and won't error when it does.
      d.remains_running = false

      # The amount of time to wait when stopping a container before
      # sending a SIGTERM to the process.
      d.stop_timeout = 3600

      # The name of the Vagrant machine in the vagrant_vagrantfile to
      # use as the host machine. This defaults to "default".
      #d.vagrant_machine = 'default'

      # Path to a Vagrantfile that contains the vagrant_machine to
      # use as the host VM if needed.
      #d.vagrant_vagrantfile = './vagrant/host/Vagrantfile'

      # List of directories to mount as volumes into the container.
      # These directories must exist in the host where Docker is running.
      # If you want to sync folders from the host Vagrant is running,
      # just use synced folders.
      #d.volumes = ['/path/to/volume1', '/path/to/volume2']
    end
    #app.vm.provision 'shell', inline: 'echo Hello'
  end
end
