require 'yaml'

module Chi
  class BackupCommand < Thor
    include Thor::Actions

    default_command :main

    desc 'main', 'Backup using zip'
    def main
      config = YAML.load_file(Dir.home + '/.chi.config.yaml')
      config['backup']['zip']['paths'].each do |path|
        path = File.expand_path(path)
        zip_folder(path)
      end
    end

    no_commands {
      def zip_folder(path)
        target_base_path = File.expand_path('~/Desktop')
        parent_path = File.dirname(path)

        target_compressed_file = target_base_path + '/' +
          File.basename(path) + '.' + DateTime.now.strftime('%Y-%m-%d.%H-%M-%S') + '.tar.gz'
        say "\nCompressing #{path}\n    to: #{target_compressed_file} ..."
        run "tar -zcf \"#{target_compressed_file}\" -C \"#{parent_path}\" \"#{File.basename(path)}\""
        if $?.exitstatus == 0
          say "Done", :green
        else
          say "Failed", :red
        end
      end
    }
  end
end
